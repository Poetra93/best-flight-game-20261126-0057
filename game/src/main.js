// Merapi Ridge Run — the game loop and the state machine.
//
// One canvas, four states: title, playing, paused, end. main.js wires
// the modules together and owns nothing else: terrain builds the ridge,
// flight.js moves the plane, missions.js judges the sortie, render.js
// draws the world, hud.js draws the HUD and the screens, audio.js
// synthesises the sound, input.js reads the keys and the mouse, and
// shots.js places the deterministic screenshot states.
//
// A ?shot=<name>&seed=<n> URL freezes the game in that shot's state so
// screenshots are real renders of the game, identical on every run.

import { VIEW_W, VIEW_H } from './config.js';
import { buildTerrain, groundAt, HOME_STRIP } from './terrain.js';
import { newPlane, stepFlight, resetPlane } from './flight.js';
import { missionById, newSortie, stepMission } from './missions.js';
import { drawWorld, newParticles, spawnBurst, stepParticles } from './render.js';
import { drawHud, drawTitle, drawPause, drawEnd } from './hud.js';
import { newAudio, ensureAudio, updateEngineSound, playRingChime, playThud, playCrash, playWin, toggleMute } from './audio.js';
import { newInput, attachInput, readControls, takeClick } from './input.js';
import { applyShot, SHOT_TIME } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');

const game = {
  terrain: buildTerrain(seed),
  plane: null,
  sortie: null,
  particles: newParticles(),
  audio: newAudio(),
  input: newInput(),
  state: 'title',
  messages: [],
  time: 0,
  titleButtons: [],
  frozen: false,
};

game.plane = newPlane(HOME_STRIP.x + 90, groundAt(game.terrain, HOME_STRIP.x + 90));
game.sortie = newSortie(missionById('rings'), game.terrain, seed);

export function startMission(missionId, missionSeed = seed, opts = {}) {
  const mission = missionById(missionId);
  const startX = HOME_STRIP.x + 90;
  resetPlane(game.plane, startX, groundAt(game.terrain, startX), mission.fuel);
  game.sortie = newSortie(mission, game.terrain, missionSeed);
  game.particles = newParticles();
  game.messages = [];
  game.state = 'playing';
  if (!opts.quiet) {
    game.messages.push({ kind: 'info', text: `${mission.name.toUpperCase()} — ${mission.blurb}`, at: game.time });
  }
}
game.startMission = startMission;

function endSortieSounds() {
  if (game.sortie.result === 'win') playWin(game.audio);
  else playCrash(game.audio);
}

function onKey(code, down) {
  if (!down) return;
  ensureAudio(game.audio);
  if (code === 'KeyM') {
    toggleMute(game.audio);
    return;
  }
  if (game.state === 'title') {
    if (code === 'Digit1') startMission('rings');
    if (code === 'Digit2') startMission('rescue');
    if (code === 'Digit3') startMission('mail');
    return;
  }
  if (game.state === 'playing') {
    if (code === 'KeyP') game.state = 'paused';
    if (code === 'KeyR') startMission(game.sortie.mission.id);
    return;
  }
  if (game.state === 'paused') {
    if (code === 'KeyP') game.state = 'playing';
    if (code === 'KeyR') startMission(game.sortie.mission.id);
    return;
  }
  if (game.state === 'end') {
    if (code === 'KeyR') startMission(game.sortie.mission.id);
    if (code === 'KeyT') game.state = 'title';
  }
}

attachInput(game.input, canvas, onKey);

function handleTitleClick() {
  const click = takeClick(game.input);
  if (!click || game.state !== 'title') return;
  for (const b of game.titleButtons) {
    if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
      ensureAudio(game.audio);
      startMission(b.mission);
      return;
    }
  }
}

function update(dt) {
  const plane = game.plane;
  // Mouse steer assist needs the plane's screen position: recompute it
  // from the camera the renderer used last frame (kept on the game).
  const screenY = game.lastCam ? plane.y - game.lastCam.y : null;
  const controls = readControls(game.input, screenY);

  const events = stepFlight(plane, controls, game.sortie.mission.wind, dt, (x) => groundAt(game.terrain, x));
  const notes = stepMission(game.sortie, plane, game.terrain, events, dt);

  for (const note of notes) {
    game.messages.push({ kind: note.kind, text: note.text, at: game.time });
  }
  if (notes.some((n) => n.kind === 'ring')) playRingChime(game.audio);
  if (events.includes('touchdown')) {
    playThud(game.audio);
    spawnBurst(game.particles, plane.x, plane.y + 8, 14, '#d8c9a3', 60);
  }
  if (events.includes('crash')) {
    spawnBurst(game.particles, plane.x, plane.y, 40, '#5a5a5a', 140);
    spawnBurst(game.particles, plane.x, plane.y, 24, '#ff6b5e', 110);
  }
  if (plane.airborne && plane.speed > 10 && Math.random() < dt * 20) {
    game.particles.push({
      x: plane.x - 44, y: plane.y + 4,
      vx: -30 - Math.random() * 20, vy: (Math.random() - 0.5) * 12,
      life: 0.5, max: 0.5, color: 'rgba(255,255,255,0.5)', size: 2,
    });
  }
  if (plane.damage > 55 && plane.airborne && Math.random() < dt * 8) {
    game.particles.push({
      x: plane.x - 10, y: plane.y - 4,
      vx: -40, vy: -20,
      life: 0.9, max: 0.9, color: 'rgba(90,90,90,0.7)', size: 4,
    });
  }

  stepParticles(game.particles, dt);
  updateEngineSound(game.audio, plane);

  // Drop messages older than a few seconds.
  game.messages = game.messages.filter((m) => game.time - m.at < 2.6);

  if (game.sortie.result) {
    game.state = 'end';
    endSortieSounds();
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const time = game.frozen ? SHOT_TIME : game.time;
  game.lastCam = drawWorld(ctx, game, time);
  if (game.state === 'title') {
    game.titleButtons = drawTitle(ctx, time);
  } else if (game.state === 'playing' || game.state === 'paused') {
    drawHud(ctx, game.plane, game.sortie, game.terrain, game.messages, time);
    if (game.state === 'paused') drawPause(ctx);
  } else if (game.state === 'end') {
    drawHud(ctx, game.plane, game.sortie, game.terrain, [], time);
    drawEnd(ctx, game.sortie);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!game.frozen) {
    game.time += dt;
    handleTitleClick();
    if (game.state === 'playing') update(dt);
  }
  render();
  requestAnimationFrame(frame);
}

// Screenshot states freeze the clock and the simulation.
if (shotName) {
  document.body.classList.add('shot');
  const shot = applyShot(game, shotName, seed);
  game.state = shot.state;
  game.frozen = shot.frozen;
}

requestAnimationFrame(frame);
