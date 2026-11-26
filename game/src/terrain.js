// The ridge itself: terrain, airstrips, villages and rings' ground.
//
// The world is a heightmap built from layered noise: a big volcano cone
// (Merapi) in the middle distance, rolling hills, and stepped rice
// terraces near the ground. Two flat airstrips are carved into it — the
// home strip at the west end and the mountain strip for the rescue
// mission — plus the coastline where the land meets the sea at the east
// end. Villages, trees and terrace steps are placed once from the seed,
// then read back by render.js.

import { WORLD_W, WORLD_H } from './config.js';
import { clamp, makeNoise1D, mulberry32 } from './random.js';

export const HOME_STRIP = { x: 260, width: 420 };
export const MOUNTAIN_STRIP = { x: 9400, width: 380 };
export const COAST_STRIP = { x: 12400, width: 430 };

const VOLCANO_X = 5600;
const VOLCANO_HALF = 1500;

function baseHeight(x, hills) {
  // Rolling hills, higher toward the volcano, falling to the sea.
  let h = 560 + hills(x) * 130;
  const d = Math.abs(x - VOLCANO_X) / VOLCANO_HALF;
  if (d < 1) h += (1 - d) * 260 * (1 - d * 0.4);
  // The land runs down to the coast and levels off at the shore.
  const coast = clamp((x - 11000) / 1400, 0, 1);
  h = h * (1 - coast * 0.6) + 640 * coast * 0.6;
  return clamp(h, 180, WORLD_H - 60);
}

export function buildTerrain(seed) {
  const hills = makeNoise1D(seed * 7 + 11, 620);
  const fine = makeNoise1D(seed * 13 + 5, 170);
  const rand = mulberry32(seed * 31 + 3);

  const step = 20;
  const points = [];
  for (let x = 0; x <= WORLD_W; x += step) {
    let y = baseHeight(x, hills) + fine(x) * 22;
    points.push({ x, y });
  }

  // Carve the strips flat after the hills are laid down.
  const strips = [
    { ...HOME_STRIP, flat: 620 },
    { ...MOUNTAIN_STRIP, flat: 470 },
    { ...COAST_STRIP, flat: 640 },
  ];
  for (const p of points) {
    for (const s of strips) {
      const centre = s.x + s.width / 2;
      const half = s.width / 2 + 70;
      const d = Math.abs(p.x - centre) / half;
      if (d < 1) {
        // 1 at the strip's centre, 0 at the blend's edge.
        const t = (1 + Math.cos(d * Math.PI)) / 2;
        p.y = p.y * (1 - t) + s.flat * t;
      }
    }
  }

  // Villages: clusters of houses on flat-ish ground, away from strips.
  const villages = [];
  let tries = 0;
  while (villages.length < 7 && tries < 400) {
    tries += 1;
    const x = 900 + rand() * (WORLD_W - 2600);
    const nearStrip = strips.some((s) => Math.abs(x - (s.x + s.width / 2)) < s.width);
    if (nearStrip) continue;
    if (Math.abs(x - VOLCANO_X) < 900) continue;
    villages.push({ x, houses: 3 + Math.floor(rand() * 4) });
  }

  // Terrace bands: stepped fields on the hillsides, stored as x ranges.
  const terraces = [];
  for (let i = 0; i < 26; i += 1) {
    const x = 700 + rand() * (WORLD_W - 2400);
    terraces.push({ x, w: 120 + rand() * 260, steps: 3 + Math.floor(rand() * 4) });
  }

  // Trees scattered on the hills.
  const trees = [];
  for (let i = 0; i < 160; i += 1) {
    trees.push({ x: 200 + rand() * (WORLD_W - 400), s: 0.7 + rand() * 0.9 });
  }

  return { points, step, strips, villages, terraces, trees };
}

// Ground height at any world x, by interpolating the sampled points.
export function groundAt(terrain, x) {
  const { points, step } = terrain;
  const fx = clamp(x, 0, WORLD_W) / step;
  const i = Math.min(Math.floor(fx), points.length - 2);
  const f = fx - i;
  return points[i].y + (points[i + 1].y - points[i].y) * f;
}

export function stripAt(terrain, x) {
  for (const s of terrain.strips) {
    if (x >= s.x && x <= s.x + s.width) return s;
  }
  return null;
}
