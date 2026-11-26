// Rendering for Merapi Ridge Run: everything the pilot sees, drawn on
// one 2D canvas in a single flat-shaded style.
//
// The camera follows the plane along the ridge. Layers, back to front:
// sky gradient with sun and drifting clouds, the Merapi volcano and far
// hills in parallax, the near terrain with rice terraces, villages and
// trees, the sea at the east end, the airstrips, the target rings, the
// plane itself, and particles (prop wash, dust, smoke, confetti). The
// HUD lives in hud.js, not here.

import { VIEW_W, VIEW_H, WORLD_W, PALETTE } from './config.js';
import { groundAt } from './terrain.js';
import { clamp, lerp } from './random.js';

export function newParticles() {
  return [];
}

export function spawnBurst(particles, x, y, n, color, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.5, max: 1.1, color, size: 2 + Math.random() * 4 });
  }
}

export function stepParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
  }
}

function drawSky(ctx, camX, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Sun, fixed in the sky's east.
  const sunX = VIEW_W - 180;
  const sunY = 110;
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();

  // Clouds drift slowly with the wind, in two parallax layers.
  for (let layer = 0; layer < 2; layer += 1) {
    const speed = layer === 0 ? 6 : 14;
    const yBase = layer === 0 ? 90 : 170;
    ctx.fillStyle = layer === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 7; i += 1) {
      const cx = (((i * 397 + time * speed - camX * (0.12 + layer * 0.1)) % (VIEW_W + 320)) + VIEW_W + 320) % (VIEW_W + 320) - 160;
      const cy = yBase + ((i * 173) % 90);
      const s = 26 + ((i * 53) % 30);
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 1.6, s * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s, cy + 6, s, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVolcano(ctx, camX) {
  // Merapi: a big cone on the horizon, snow on its peak, always in view
  // as a landmark. It drifts slowly across the sky as the pilot flies
  // east — a fixed landmark, never teleporting.
  const planeScreenX = camX + VIEW_W * 0.42;
  const wrap = VIEW_W * 0.5 + (5600 - planeScreenX) * 0.12;
  const baseY = 560;
  const peakY = 210;
  ctx.fillStyle = PALETTE.volcano;
  ctx.beginPath();
  ctx.moveTo(wrap - 420, baseY);
  ctx.lineTo(wrap - 60, peakY + 40);
  ctx.lineTo(wrap, peakY);
  ctx.lineTo(wrap + 60, peakY + 40);
  ctx.lineTo(wrap + 420, baseY);
  ctx.closePath();
  ctx.fill();
  // Snow cap.
  ctx.fillStyle = PALETTE.volcanoSnow;
  ctx.beginPath();
  ctx.moveTo(wrap - 78, peakY + 52);
  ctx.lineTo(wrap, peakY);
  ctx.lineTo(wrap + 78, peakY + 52);
  ctx.lineTo(wrap + 34, peakY + 66);
  ctx.lineTo(wrap, peakY + 48);
  ctx.lineTo(wrap - 34, peakY + 66);
  ctx.closePath();
  ctx.fill();
  // A lazy smoke thread from the crater.
  ctx.fillStyle = 'rgba(240,240,235,0.5)';
  ctx.beginPath();
  ctx.ellipse(wrap + 14, peakY - 26, 10, 26, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Far hills rolling under the volcano, filled to the bottom so no
  // band of sky shows between the hills and the near terrain.
  ctx.fillStyle = PALETTE.farHill;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  ctx.lineTo(0, baseY);
  for (let x = 0; x <= VIEW_W; x += 40) {
    const wx = x + camX * 0.4;
    const y = baseY - 40 - Math.sin(wx * 0.0016) * 46 - Math.sin(wx * 0.004) * 18;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawTerrain(ctx, terrain, camX, camY) {
  const { points, step } = terrain;
  const startX = Math.max(0, camX - 60);
  const endX = Math.min(WORLD_W, camX + VIEW_W + 60);

  // The ground body.
  ctx.fillStyle = PALETTE.midHill;
  ctx.beginPath();
  ctx.moveTo(startX - camX, VIEW_H);
  for (let x = startX; x <= endX; x += step) {
    const i = Math.min(Math.floor(x / step), points.length - 1);
    ctx.lineTo(x - camX, points[i].y - camY);
  }
  ctx.lineTo(endX - camX, VIEW_H);
  ctx.closePath();
  ctx.fill();

  // Rice terraces: stepped bands hugging the hillsides.
  for (const t of terrain.terraces) {
    if (t.x + t.w < startX || t.x > endX) continue;
    const gy = groundAt(terrain, t.x + t.w / 2) - camY;
    for (let s = 0; s < t.steps; s += 1) {
      const y = gy - s * 16;
      const w = t.w * (1 - (s / t.steps) * 0.35);
      ctx.fillStyle = [PALETTE.terraceA, PALETTE.terraceB, PALETTE.terraceC][s % 3];
      ctx.fillRect(t.x - camX + (t.w - w) / 2, y - 6, w, 7);
    }
  }

  // Villages: little houses with red roofs.
  for (const v of terrain.villages) {
    if (v.x < startX - 120 || v.x > endX + 120) continue;
    const gy = groundAt(terrain, v.x) - camY;
    for (let h = 0; h < v.houses; h += 1) {
      const hx = v.x + h * 34 - camX;
      ctx.fillStyle = PALETTE.villageWall;
      ctx.fillRect(hx, gy - 22, 26, 22);
      ctx.fillStyle = PALETTE.villageRoof;
      ctx.beginPath();
      ctx.moveTo(hx - 3, gy - 22);
      ctx.lineTo(hx + 13, gy - 34);
      ctx.lineTo(hx + 29, gy - 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Trees: round canopies on the slopes.
  ctx.fillStyle = PALETTE.paddy;
  for (const tree of terrain.trees) {
    if (tree.x < startX || tree.x > endX) continue;
    const gy = groundAt(terrain, tree.x) - camY;
    const s = tree.s;
    ctx.beginPath();
    ctx.arc(tree.x - camX, gy - 14 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(tree.x - camX - 1.5 * s, gy - 8 * s, 3 * s, 8 * s);
  }

  // The sea at the east end, lapping the sand.
  if (endX > 11800) {
    const seaX = 11800 - camX;
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(seaX, 0), 620 - camY, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(Math.max(seaX + 60, 0), 636 - camY, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.seaDeep;
    for (let i = 0; i < 5; i += 1) {
      const wy = 660 - camY + i * 26;
      ctx.fillRect(Math.max(seaX + 60, 0), wy, VIEW_W, 3);
    }
  }

  // Airstrips: dark tarmac with a centre line and a windsock.
  for (const s of terrain.strips) {
    if (s.x + s.width < startX || s.x > endX) continue;
    const gy = groundAt(terrain, s.x + s.width / 2) - camY;
    ctx.fillStyle = PALETTE.strip;
    ctx.fillRect(s.x - camX, gy - 6, s.width, 10);
    ctx.fillStyle = PALETTE.stripMark;
    for (let x = s.x + 14; x < s.x + s.width - 20; x += 44) {
      ctx.fillRect(x - camX, gy - 2, 24, 3);
    }
    // Windsock on a pole at the strip's west end.
    const px = s.x - camX + 8;
    ctx.strokeStyle = PALETTE.planeDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, gy - 6);
    ctx.lineTo(px, gy - 34);
    ctx.stroke();
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(px, gy - 34);
    ctx.lineTo(px + 22, gy - 30);
    ctx.lineTo(px + 22, gy - 24);
    ctx.lineTo(px, gy - 28);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRings(ctx, rings, nextRing, camX, camY, time) {
  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i];
    if (ring.passed) continue;
    const x = ring.x - camX;
    const y = ring.y - camY;
    if (x < -120 || x > VIEW_W + 120) continue;
    const isNext = i === nextRing;
    const pulse = isNext ? 1 + Math.sin(time * 5) * 0.08 : 1;
    const r = ring.r * pulse;
    ctx.lineWidth = isNext ? 10 : 6;
    ctx.strokeStyle = isNext ? '#ffd23f' : '#ff8c42';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, r - 8, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      ctx.fillStyle = '#3a3f4a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${i + 1}`, x, y - r - 14);
    }
  }
}

// The plane, drawn in profile facing right, banked by its pitch.
// Red and white livery, spinning prop, a lit cockpit window.
export function drawPlane(ctx, plane, camX, camY, time) {
  const x = plane.x - camX;
  const y = plane.y - camY;
  const roll = clamp(plane.bank, -1, 1) * 0.28 + clamp(plane.pitch, -1, 1) * 0.22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  if (plane.crashed) ctx.rotate(0.5);

  // Tail.
  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-46, -20);
  ctx.lineTo(-36, -20);
  ctx.lineTo(-24, -4);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = PALETTE.planeWhite;
  ctx.beginPath();
  ctx.moveTo(-38, -6);
  ctx.quadraticCurveTo(-10, -16, 26, -8);
  ctx.quadraticCurveTo(40, -4, 40, 2);
  ctx.quadraticCurveTo(20, 10, -12, 10);
  ctx.quadraticCurveTo(-34, 8, -38, -6);
  ctx.closePath();
  ctx.fill();
  // Red cheatline and tail band.
  ctx.fillStyle = PALETTE.planeRed;
  ctx.fillRect(-38, 0, 76, 4);
  ctx.fillRect(-36, -8, 6, 14);
  // Wing (the near wing, seen edge-on from the side, swept back).
  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(16, 26);
  ctx.lineTo(26, 26);
  ctx.lineTo(12, -2);
  ctx.closePath();
  ctx.fill();
  // Cockpit window, lit.
  ctx.fillStyle = '#bfe6f2';
  ctx.beginPath();
  ctx.ellipse(16, -8, 9, 6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.planeDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Registration.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-MRR', -16, 4);
  // Spinning prop.
  const blur = 0.5 + Math.min(plane.throttle / 100, 1) * 0.5;
  ctx.strokeStyle = `rgba(58, 63, 74, ${blur})`;
  ctx.lineWidth = 3;
  const prop = time * (6 + plane.throttle * 0.35);
  ctx.beginPath();
  ctx.moveTo(40 + Math.cos(prop) * 16, Math.sin(prop) * 16);
  ctx.lineTo(40 - Math.cos(prop) * 16, -Math.sin(prop) * 16);
  ctx.stroke();
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.arc(40, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, particles, camX, camY) {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The whole world in one call. `cam` is {x, y} in world coordinates.
export function drawWorld(ctx, state, time) {
  const { terrain, plane, sortie, particles } = state;
  const camX = clamp(plane.x - VIEW_W * 0.42, 0, WORLD_W - VIEW_W);
  const groundY = groundAt(terrain, plane.x);
  const camY = clamp(plane.y - VIEW_H * 0.55, -140, groundY - VIEW_H * 0.42);
  const cam = { x: camX, y: camY };

  drawSky(ctx, camX, time);
  drawVolcano(ctx, camX);
  drawTerrain(ctx, terrain, camX, camY);
  drawRings(ctx, sortie.rings, sortie.nextRing, camX, camY, time);
  drawPlane(ctx, plane, camX, camY, time);
  drawParticles(ctx, particles, camX, camY);
  return cam;
}
