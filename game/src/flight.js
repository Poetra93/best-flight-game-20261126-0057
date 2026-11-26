// Flight physics for Merapi Ridge Run: one little prop plane.
//
// Coordinates are canvas coordinates: y grows downward, so climbing
// means y shrinking. The plane is a point with speed, position, pitch
// and throttle. Lift grows with speed and with flaps; below the stall
// speed the wing gives up and the plane sinks. Throttle pushes the
// speed toward its target, drag and gravity pull it back. Fuel drains
// with throttle, damage accrues on hard contact and overspeed. Nothing
// here draws anything — render.js reads this state, missions.js judges it.

import { PLANE, DAMAGE } from './config.js';
import { clamp } from './random.js';

export function newPlane(x, y) {
  return {
    x, // world position, px (canvas coords: y grows downward)
    y, // canvas y of the plane; smaller = higher in the sky
    speed: 0, // px/s forward
    pitch: 0, // -1 (full dive) .. 1 (full climb)
    throttle: 0, // 0 .. 100
    fuel: 100,
    damage: 0,
    flaps: false,
    bank: 0, // visual roll, -1 .. 1
    airborne: false,
    verticalSpeed: 0, // px/s, positive = descending
    lastImpact: 0, // vertical speed at the last touchdown, px/s
    crashed: false,
    landed: false,
    onGround: true,
  };
}

// One physics step. `ctrl` carries the pilot's inputs for this frame:
// throttleUp/throttleDown, climb/dive, flaps. `wind` is px/s of headwind
// (negative) or tailwind. `groundY` gives the terrain's canvas y at an x.
// Returns a list of events for this step: 'stall', 'overspeed',
// 'touchdown', 'crash', 'out-of-fuel'.
export function stepFlight(plane, ctrl, wind, dt, groundY) {
  const events = [];
  if (plane.crashed) return events;

  // Throttle lever.
  if (ctrl.throttleUp) plane.throttle += PLANE.throttleStep * dt;
  if (ctrl.throttleDown) plane.throttle -= PLANE.throttleStep * dt;
  plane.throttle = clamp(plane.throttle, 0, 100);
  plane.flaps = !!ctrl.flaps;

  // Target speed from throttle, eased by headwind drag and flap drag.
  // Diving builds speed (and can overspeed the airframe); climbing
  // bleeds it, so the pilot must manage the throttle.
  let target = (plane.throttle / 100) * PLANE.cruiseSpeed;
  if (plane.flaps) target *= PLANE.flapDrag;
  target += wind * 0.4;
  if (plane.airborne && plane.pitch < 0) target += -plane.pitch * 130;
  if (plane.airborne && plane.pitch > 0) target -= plane.pitch * 50;
  const accel = plane.onGround ? 90 : 60;
  plane.speed += clamp(target - plane.speed, -accel * dt, accel * dt);
  plane.speed = Math.max(0, plane.speed);

  // Pitch from the bank keys, eased so the plane feels weighty but
  // still answers quickly enough to pull out of a dive.
  const wantPitch = ctrl.climb ? 1 : ctrl.dive ? -1 : 0;
  plane.pitch += clamp(wantPitch - plane.pitch, -3.0 * dt, 3.0 * dt);
  plane.bank += clamp(wantPitch - plane.bank, -2.6 * dt, 2.6 * dt);

  // Lift: enough speed and the wing carries the plane; too slow and it
  // sinks, faster with flaps out. Pitch turns speed into climb or dive.
  const liftFactor = plane.flaps ? PLANE.flapLift : 1;
  const lift = clamp(plane.speed / PLANE.minSpeed, 0, 1.6) * liftFactor;
  let dy = 0; // positive = descending
  if (lift >= 1) {
    // Capped at lift 1.0: even a full dive stays under the crash impact
    // band, so diving onto flat ground is a hard landing, not a wreck.
    dy = -plane.pitch * (plane.pitch > 0 ? PLANE.climbRate : PLANE.diveRate) * Math.min(lift, 1.0);
  } else {
    dy = 120 * (1 - lift); // sinking toward a stall
    if (plane.pitch < 0) dy += -plane.pitch * PLANE.diveRate * 0.5;
  }
  plane.verticalSpeed = dy;
  plane.y += dy * dt;

  // Thin air: the little prop plane cannot climb past the ceiling.
  if (plane.y < -120) {
    plane.y = -120;
    plane.verticalSpeed = 0;
  }

  // Forward motion.
  plane.x += plane.speed * dt;

  // Fuel: throttle drinks it, idling sips it.
  const drain = PLANE.fuelIdle + (PLANE.fuelDrain - PLANE.fuelIdle) * (plane.throttle / 100);
  plane.fuel = Math.max(0, plane.fuel - drain * dt);
  if (plane.fuel <= 0 && plane.throttle > 0) {
    plane.throttle = 0;
    events.push('out-of-fuel');
  }

  // Overspeed shakes the airframe apart, slowly.
  if (plane.speed > PLANE.maxSpeed) {
    plane.damage = Math.min(100, plane.damage + DAMAGE.overspeed * dt);
    events.push('overspeed');
  }

  // Ground contact.
  const ground = groundY(plane.x);
  if (plane.y >= ground) {
    plane.y = ground;
    const impact = Math.abs(plane.verticalSpeed);
    plane.lastImpact = impact;
    if (!plane.onGround) {
      if (impact > 180 || plane.speed > 300) {
        plane.damage = Math.min(100, plane.damage + DAMAGE.terrainStrike);
        plane.crashed = true;
        events.push('crash');
      } else if (impact > 120) {
        plane.damage = Math.min(100, plane.damage + DAMAGE.hardLanding);
        events.push('touchdown');
      } else {
        events.push('touchdown');
      }
    }
    plane.onGround = true;
    plane.airborne = false;
    plane.verticalSpeed = 0;
    if (plane.speed < 40) plane.landed = true;
  } else {
    plane.onGround = false;
    plane.airborne = true;
    plane.landed = false;
    if (lift < 1 && plane.speed < PLANE.minSpeed) events.push('stall');
  }

  if (plane.damage >= 100 && !plane.crashed) {
    plane.crashed = true;
    events.push('crash');
  }
  return events;
}

export function resetPlane(plane, x, y, fuel) {
  const fresh = newPlane(x, y);
  fresh.fuel = fuel;
  Object.assign(plane, fresh);
}
