// Merapi Ridge Run — all the numbers that tune the game in one place.
// Canvas size, world size, the plane's flight envelope, fuel and damage
// rates, and the three missions. Nothing here touches the DOM or the
// canvas: it is only data the other modules read.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// The ridge the pilot flies over: a long strip of world, in pixels.
// The home airstrip sits at the left, the far airstrip at the right.
export const WORLD_W = 13200;
export const WORLD_H = 900;

// The plane's flight envelope.
export const PLANE = {
  cruiseSpeed: 210, // px/s at full throttle, level
  minSpeed: 55, // below this the wing stops lifting and the plane sinks
  maxSpeed: 340, // diving past this shakes the airframe
  climbRate: 150, // px/s of climb at full bank and good speed
  diveRate: 160, // px/s of dive at full bank down
  throttleStep: 55, // %/s the throttle lever moves
  fuelDrain: 0.55, // % fuel per second at full throttle
  fuelIdle: 0.06, // % fuel per second at idle
  flapLift: 1.45, // lift multiplier with flaps out
  flapDrag: 0.62, // speed multiplier with flaps out
};

// Damage the airframe takes.
export const DAMAGE = {
  hardLanding: 22, // vertical speed over the safe band on touchdown
  terrainStrike: 55, // hitting a hillside at speed
  scrape: 8, // brushing the ground
  overspeed: 6, // per second above maxSpeed
};

// Scoring.
export const SCORE = {
  ring: 500,
  ringCombo: 150, // added per consecutive ring without a miss
  smoothLanding: 800,
  roughLanding: 250,
  rescueBonus: 1200,
  deliveryBonus: 1000,
  timeBonusPerSec: 12, // left on the clock when a mission ends
};

// The three missions. Each names its goal, its rings or strips, the wind
// and the fuel it starts with, so missions.js can build a sortie from it.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread 8 target rings over the ridge. Clean flying builds a combo.',
    rings: 8,
    fuel: 100,
    wind: 0,
    timeLimit: 150,
  },
  {
    id: 'rescue',
    name: 'Ridge Rescue',
    blurb: 'Land on the mountain strip at 9,400 m, pick up the climber, take off again.',
    rings: 0,
    fuel: 100,
    wind: 12,
    timeLimit: 240,
  },
  {
    id: 'mail',
    name: 'Storm Mail Run',
    blurb: 'Carry the mail to the coastal strip through a headwind. Fuel is tight.',
    rings: 3,
    fuel: 62,
    wind: -46,
    timeLimit: 210,
  },
];

// Palette: one flat-shaded style for sky, terrain and plane.
export const PALETTE = {
  skyTop: '#7ec8e3',
  skyMid: '#bfe6f2',
  skyLow: '#f6e3b8',
  sun: '#ffd76a',
  volcano: '#8d7d8a',
  volcanoSnow: '#f4f0ea',
  farHill: '#9db98a',
  midHill: '#7ba05b',
  terraceA: '#8fbf6f',
  terraceB: '#6da34f',
  terraceC: '#a8c97a',
  paddy: '#5d9c4a',
  villageRoof: '#c65b4e',
  villageWall: '#f2e3c6',
  sea: '#3f8fb5',
  seaDeep: '#2f6f92',
  sand: '#e8d9a8',
  strip: '#5b5b66',
  stripMark: '#f5f0e1',
  planeRed: '#d8443c',
  planeWhite: '#f7f3ea',
  planeDark: '#3a3f4a',
  hudPanel: 'rgba(20, 28, 40, 0.72)',
  hudText: '#f5f2e8',
  hudAmber: '#ffc857',
  hudGreen: '#7ee081',
  hudRed: '#ff6b5e',
};
