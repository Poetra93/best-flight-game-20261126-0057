// Seeded randomness for Merapi Ridge Run.
//
// Everything procedural — the ridge line, the terraces, the villages, the
// ring positions — comes from one seeded generator, so a screenshot query
// (?shot=play&seed=1) renders the same world every time. mulberry32 is a
// small, well-known PRNG; the value-noise helpers below turn it into
// smooth 1-D terrain.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise: a lattice of random control points, blended with
// a cosine curve, so hills roll instead of jittering.
export function makeNoise1D(seed, spacing) {
  const rand = mulberry32(seed);
  const points = [];
  const count = 256;
  for (let i = 0; i < count; i += 1) points.push(rand() * 2 - 1);
  return function noise(x) {
    const scaled = x / spacing;
    const i0 = Math.floor(scaled);
    const i1 = i0 + 1;
    const f = scaled - i0;
    const blend = (1 - Math.cos(f * Math.PI)) / 2;
    const a = points[((i0 % count) + count) % count];
    const b = points[((i1 % count) + count) % count];
    return a + (b - a) * blend;
  };
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
