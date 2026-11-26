// Missions for Merapi Ridge Run: goals, rings, scoring, win and loss.
//
// A mission is a sortie built from one of the MISSIONS definitions in
// config.js: rings to thread, a strip to land on, a delivery to make,
// a clock and a fuel load. This module owns the sortie state — which
// ring is next, whether the rescue pickup happened, the score and the
// combo — and answers the two questions the game loop asks every frame:
// has the pilot won, and has the sortie failed?

import { MISSIONS, SCORE } from './config.js';
import { groundAt, stripAt, HOME_STRIP, MOUNTAIN_STRIP, COAST_STRIP } from './terrain.js';
import { mulberry32 } from './random.js';

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}

// Ring positions for a mission: spread across the ridge at varied
// altitudes, seeded so a given seed always flies the same course.
export function buildRings(mission, terrain, seed) {
  const rand = mulberry32(seed * 101 + 17);
  const rings = [];
  const count = mission.rings;
  // Altitudes wander smoothly from ring to ring (a random walk), so the
  // course flows instead of demanding a steep dive after a high ring.
  let alt = 190 + rand() * 60;
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / (count + 1);
    const x = 1400 + t * 10200;
    const ground = groundAt(terrain, x);
    alt = Math.max(150, Math.min(300, alt + (rand() - 0.5) * 90));
    rings.push({ x, y: ground - alt, r: 52, passed: false });
  }
  return rings;
}

export function newSortie(mission, terrain, seed) {
  return {
    mission,
    rings: buildRings(mission, terrain, seed),
    nextRing: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: mission.timeLimit,
    pickedUp: false, // rescue: the climber is aboard
    delivered: false, // mail: the parcel reached the coast strip
    landedStrip: null, // the strip the plane is parked on, if any
    result: null, // 'win' | 'lost' once the sortie ends
    reason: '',
    stars: 0,
  };
}

function ringHit(plane, ring) {
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  return dx * dx + dy * dy < ring.r * ring.r * 0.55;
}

// One mission step: advance the clock, check rings, landings and the
// delivery, and decide the outcome. `events` are the flight events
// stepFlight reported this frame. Returns short messages for the HUD
// (ring chimes, pickup, delivery) when something happened.
export function stepMission(sortie, plane, terrain, events, dt) {
  const notes = [];
  if (sortie.result) return notes;
  sortie.timeLeft -= dt;

  // Rings: threading the next one scores, and keeps the combo alive.
  const ring = sortie.rings[sortie.nextRing];
  if (ring && plane.airborne && ringHit(plane, ring)) {
    ring.passed = true;
    sortie.nextRing += 1;
    sortie.combo += 1;
    sortie.bestCombo = Math.max(sortie.bestCombo, sortie.combo);
    const gained = SCORE.ring + SCORE.ringCombo * (sortie.combo - 1);
    sortie.score += gained;
    notes.push({ kind: 'ring', text: `RING ${sortie.nextRing}/${sortie.rings.length}  +${gained}` });
  }

  // Touchdowns: what the pilot landed on, and how gently.
  if (events.includes('touchdown') || events.includes('crash')) {
    const strip = stripAt(terrain, plane.x);
    const gentle = plane.lastImpact <= 120 && plane.speed < 200;
    if (strip && !plane.crashed) {
      sortie.landedStrip = strip;
      if (sortie.mission.id === 'rescue') {
        if (!sortie.pickedUp && strip === MOUNTAIN_STRIP) {
          sortie.pickedUp = true;
          sortie.score += SCORE.rescueBonus;
          notes.push({ kind: 'pickup', text: `CLIMBER ABOARD  +${SCORE.rescueBonus} — TAKE OFF!` });
        } else if (sortie.pickedUp && strip === HOME_STRIP) {
          finishSortie(sortie, true, 'Climber delivered home safe.');
          return notes;
        }
      } else if (sortie.mission.id === 'mail' && strip === COAST_STRIP) {
        sortie.delivered = true;
        sortie.score += SCORE.deliveryBonus;
        finishSortie(sortie, true, 'Mail delivered to the coast strip.');
        return notes;
      } else if (sortie.mission.id === 'rings' && strip === HOME_STRIP && sortie.nextRing >= sortie.rings.length) {
        finishSortie(sortie, true, 'All rings threaded — welcome home.');
        return notes;
      }
      sortie.score += gentle ? SCORE.smoothLanding : SCORE.roughLanding;
      notes.push({ kind: 'land', text: gentle ? `SMOOTH LANDING  +${SCORE.smoothLanding}` : `ROUGH LANDING  +${SCORE.roughLanding}` });
    }
  }

  if (events.includes('crash')) {
    finishSortie(sortie, false, plane.damage >= 100 ? 'Airframe broke apart.' : 'Crashed into the ridge.');
    return notes;
  }

  // Ring Run ends the moment the last ring is threaded.
  if (sortie.mission.id === 'rings' && sortie.nextRing >= sortie.rings.length && sortie.rings.length > 0) {
    finishSortie(sortie, true, 'All 8 rings threaded!');
    return notes;
  }

  // Fuel out while airborne, or the clock run out, ends the sortie.
  if (plane.fuel <= 0 && plane.airborne) {
    finishSortie(sortie, false, 'Out of fuel over the ridge.');
  } else if (sortie.timeLeft <= 0) {
    finishSortie(sortie, false, 'Out of time.');
  }
  return notes;
}

function finishSortie(sortie, won, reason) {
  sortie.result = won ? 'win' : 'lost';
  sortie.reason = reason;
  if (won) {
    sortie.score += Math.max(0, Math.round(sortie.timeLeft)) * SCORE.timeBonusPerSec;
    sortie.stars = 1;
    if (sortie.bestCombo >= 3 || sortie.timeLeft > 60) sortie.stars = 2;
    if (sortie.bestCombo >= 5 && sortie.timeLeft > 30) sortie.stars = 3;
  }
}

// Heading in degrees from the plane's motion: 90 is due east along the
// ridge, 0 is straight up, 180 straight down. The HUD compass reads it.
export function headingOf(plane) {
  const angle = Math.atan2(plane.verticalSpeed, Math.max(plane.speed, 1));
  return Math.round(((90 - (angle * 180) / Math.PI) % 360 + 360) % 360);
}
