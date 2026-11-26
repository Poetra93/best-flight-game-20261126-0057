// Deterministic screenshot states for Merapi Ridge Run.
//
// The game reads ?shot=<name>&seed=<n> from the URL. Each shot places
// the plane, the sortie and the camera in a fixed, readable state and
// freezes the clock, so a screenshot is a real render of the game in
// exactly that state, reproducible from the seed alone. The live game
// never uses these states; they exist only so the entry's screenshots
// show the game at its best.

import { HOME_STRIP, MOUNTAIN_STRIP, COAST_STRIP, groundAt } from './terrain.js';
import { missionById, newSortie } from './missions.js';
import { resetPlane } from './flight.js';

// The frozen time each shot renders at (seconds), so the prop angle,
// clouds and ring pulse are identical on every run.
export const SHOT_TIME = 1.2;

// Returns { state, missionId } for the shot, after placing the plane
// and building the sortie. `game` is the live game object from main.js.
export function applyShot(game, name, seed) {
  const { terrain, plane } = game;
  const ground = (x) => groundAt(terrain, x);

  if (name === 'play') {
    // Mid-flight over the terraces, the next ring ahead, HUD lit.
    game.startMission('rings', seed, { quiet: true });
    const next = game.sortie.rings[2];
    for (let i = 0; i < 2; i += 1) game.sortie.rings[i].passed = true;
    plane.x = next.x - 480;
    plane.y = next.y + 30;
    plane.speed = 205;
    plane.throttle = 72;
    plane.pitch = 0.15;
    plane.bank = 0.15;
    plane.airborne = true;
    plane.onGround = false;
    plane.fuel = 78;
    game.sortie.nextRing = 2;
    game.sortie.score = 1250;
    game.sortie.combo = 2;
    game.sortie.bestCombo = 2;
    game.sortie.timeLeft = 112;
    game.messages = [{ kind: 'ring', text: 'RING 2/8  +650', at: 0.4 }];
    return { state: 'playing', frozen: true };
  }

  if (name === 'rings') {
    // Threading a ring low over the ridge, combo building.
    game.startMission('rings', seed, { quiet: true });
    const ring = game.sortie.rings[3];
    for (let i = 0; i < 3; i += 1) game.sortie.rings[i].passed = true;
    plane.x = ring.x - 150;
    plane.y = ring.y + 10;
    plane.speed = 215;
    plane.throttle = 80;
    plane.pitch = 0;
    plane.bank = 0;
    plane.airborne = true;
    plane.onGround = false;
    plane.fuel = 64;
    game.sortie.nextRing = 3;
    game.sortie.score = 2100;
    game.sortie.combo = 3;
    game.sortie.bestCombo = 3;
    game.sortie.timeLeft = 96;
    return { state: 'playing', frozen: true };
  }

  if (name === 'landing') {
    // Final approach to the coast strip, flaps out, runway ahead.
    game.startMission('mail', seed, { quiet: true });
    plane.x = COAST_STRIP.x - 250;
    plane.y = ground(COAST_STRIP.x - 250) - 95;
    plane.speed = 118;
    plane.throttle = 34;
    plane.pitch = -0.12;
    plane.bank = -0.1;
    plane.flaps = true;
    plane.airborne = true;
    plane.onGround = false;
    plane.fuel = 31;
    game.sortie.timeLeft = 74;
    game.sortie.score = 1800;
    game.messages = [{ kind: 'land', text: 'COAST STRIP AHEAD — FLAPS OUT', at: 0.3 }];
    return { state: 'playing', frozen: true };
  }

  // 'start' (and anything unknown): the title screen, plane parked on
  // the home strip with the volcano behind it.
  resetPlane(plane, HOME_STRIP.x + 90, ground(HOME_STRIP.x + 90), 100);
  game.sortie = newSortie(missionById('rings'), terrain, seed);
  game.messages = [];
  void MOUNTAIN_STRIP;
  return { state: 'title', frozen: true };
}
