// The HUD and the screens for Merapi Ridge Run.
//
// The HUD is drawn on the same canvas as the world, on top of it: a top
// bar with altitude, speed, heading, fuel, damage and throttle, a
// compass strip, the mission objective and the score, plus transient
// messages (ring chimes, landings). The title, mission select, pause,
// victory and defeat screens are drawn here too — the whole game is one
// canvas, no DOM menus.

import { VIEW_W, VIEW_H, PALETTE, MISSIONS } from './config.js';
import { headingOf } from './missions.js';
import { groundAt } from './terrain.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function gaugeColor(frac) {
  return frac > 0.5 ? PALETTE.hudGreen : frac > 0.25 ? PALETTE.hudAmber : PALETTE.hudRed;
}

// Altitude in metres: the world is 900 px tall, read as 900 m of sky.
export function altitudeMetres(plane, groundY) {
  return Math.max(0, Math.round((groundY - plane.y) * 1.1));
}

export function speedKmh(plane) {
  return Math.round(plane.speed * 1.35);
}

export function drawHud(ctx, plane, sortie, terrain, messages, time) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const groundY = groundAt(terrain, plane.x);

  // Top bar.
  panel(ctx, 12, 12, VIEW_W - 24, 64);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ALT', 30, 32);
  ctx.fillText('SPD', 190, 32);
  ctx.fillText('HDG', 350, 32);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${altitudeMetres(plane, groundY)} m`, 30, 60);
  ctx.fillText(`${speedKmh(plane)}`, 190, 60);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('km/h', 258, 60);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${String(headingOf(plane)).padStart(3, '0')}°`, 350, 60);

  // Compass strip under the heading.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(350, 66, 120, 2);
  ctx.fillStyle = PALETTE.hudAmber;
  const hdg = headingOf(plane);
  ctx.fillRect(350 + ((hdg - 45 + 360) % 360) / 360 * 120 - 2, 62, 4, 10);

  // Fuel and damage bars.
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText('FUEL', 520, 32);
  ctx.fillText('DMG', 700, 32);
  ctx.fillText('THR', 880, 32);
  bar(ctx, 520, 40, 150, 14, plane.fuel / 100, gaugeColor(plane.fuel / 100));
  bar(ctx, 700, 40, 150, 14, plane.damage / 100, plane.damage > 60 ? PALETTE.hudRed : PALETTE.hudAmber);
  bar(ctx, 880, 40, 150, 14, plane.throttle / 100, '#7ec8e3');
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 520, 68);
  ctx.fillText(`${Math.round(plane.damage)}%`, 700, 68);
  ctx.fillText(`${Math.round(plane.throttle)}%`, 880, 68);

  // Flaps indicator.
  if (plane.flaps) {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('FLAPS', 1060, 32);
  }
  if (plane.speed < 55 && plane.airborne) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('STALL!', 1060, 60);
  }

  // Mission objective + score, bottom left.
  panel(ctx, 12, VIEW_H - 62, 460, 50);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  const m = sortie.mission;
  const rings = m.rings ? `  •  Rings ${sortie.nextRing}/${m.rings}` : '';
  const rescue = m.id === 'rescue' ? (sortie.pickedUp ? '  •  Climber aboard — fly home!' : '  •  Land on the mountain strip') : '';
  const mail = m.id === 'mail' ? (sortie.delivered ? '  •  Delivered!' : '  •  Deliver to the coast strip') : '';
  ctx.fillText(`${m.name}${rings}${rescue}${mail}`, 28, VIEW_H - 38);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillText(`SCORE ${sortie.score}`, 28, VIEW_H - 18);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`TIME ${Math.max(0, Math.ceil(sortie.timeLeft))}s`, 330, VIEW_H - 18);
  if (sortie.combo > 1) {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`COMBO x${sortie.combo}`, 330, VIEW_H - 38);
  }

  // Transient messages, centre-top.
  ctx.textAlign = 'center';
  messages.forEach((msg, i) => {
    const age = time - msg.at;
    if (age > 2.4) return;
    ctx.globalAlpha = age < 1.8 ? 1 : 1 - (age - 1.8) / 0.6;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = 'rgba(20, 28, 40, 0.65)';
    ctx.fillText(msg.text, VIEW_W / 2 + 2, 132 + i * 34);
    ctx.fillStyle = msg.kind === 'ring' ? '#ffd23f' : PALETTE.hudText;
    ctx.fillText(msg.text, VIEW_W / 2, 130 + i * 34);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function centred(ctx, text, y, size, color, bold = true) {
  centredAt(ctx, text, VIEW_W / 2, y, size, color, bold);
}

function centredAt(ctx, text, x, y, size, color, bold = true) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

export function drawTitle(ctx, time) {
  ctx.fillStyle = 'rgba(20, 28, 40, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centred(ctx, 'MERAPI RIDGE RUN', 210, 64, '#ffffff');
  centred(ctx, 'A bush-pilot flight game over the Indonesian ridge', 258, 22, PALETTE.hudAmber, false);
  centred(ctx, 'W / S throttle      A / D bank to climb & dive      SPACE flaps & brake', 330, 20, PALETTE.hudText, false);
  centred(ctx, 'P pause      R restart      M mute      Mouse: click buttons, steer assist', 362, 20, PALETTE.hudText, false);

  // Mission cards.
  const cardW = 320;
  const gap = 30;
  const total = MISSIONS.length * cardW + (MISSIONS.length - 1) * gap;
  let x = (VIEW_W - total) / 2;
  const buttons = [];
  MISSIONS.forEach((m, i) => {
    const y = 480;
    panel(ctx, x, y, cardW, 150);
    centredAt(ctx, `${i + 1}. ${m.name}`, x + cardW / 2, y + 36, 24, PALETTE.hudText);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#d8d2c2';
    ctx.textAlign = 'center';
    wrapText(ctx, m.blurb, x + 20, y + 66, cardW - 40, 20);
    ctx.fillStyle = '#2f6f92';
    ctx.beginPath();
    ctx.roundRect(x + 90, y + 106, 140, 32, 8);
    ctx.fill();
    centredAt(ctx, 'FLY IT', x + cardW / 2, y + 128, 16, '#ffffff');
    buttons.push({ x, y, w: cardW, h: 150, mission: m.id });
    x += cardW + gap;
  });
  centred(ctx, 'Click a mission — or press 1, 2 or 3', 700, 20, PALETTE.hudText, false);
  return buttons;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x + maxW / 2, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + maxW / 2, yy);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(20, 28, 40, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centred(ctx, 'PAUSED', 340, 56, '#ffffff');
  centred(ctx, 'P to resume — R to restart the sortie', 400, 22, PALETTE.hudText, false);
}

export function drawEnd(ctx, sortie) {
  ctx.fillStyle = 'rgba(20, 28, 40, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const won = sortie.result === 'win';
  centred(ctx, won ? 'SORTIE COMPLETE' : 'SORTIE FAILED', 260, 56, won ? PALETTE.hudGreen : PALETTE.hudRed);
  centred(ctx, sortie.reason, 310, 22, PALETTE.hudText, false);
  centred(ctx, `SCORE  ${sortie.score}`, 380, 34, PALETTE.hudAmber);
  if (won) {
    const stars = '★'.repeat(sortie.stars) + '☆'.repeat(3 - sortie.stars);
    centred(ctx, stars, 440, 44, '#ffd23f');
  }
  centred(ctx, `Best combo x${sortie.bestCombo}   •   Rings ${sortie.nextRing}/${sortie.mission.rings}`, 500, 20, PALETTE.hudText, false);
  centred(ctx, 'R — fly again      T — back to the title screen', 570, 20, PALETTE.hudText, false);
}
