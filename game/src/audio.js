// Sound for Merapi Ridge Run: everything is synthesised with WebAudio.
//
// No audio files, no network: an engine hum (two detuned sawtooths
// through a low-pass filter, pitch and loudness following the throttle),
// wind noise (looped noise through a band-pass, louder with speed), a
// ring chime, a landing thud and a crash crunch. The context is created
// lazily on the first user gesture, so a screenshot run stays silent
// and never errors.

export function newAudio() {
  return {
    ctx: null,
    master: null,
    engineOsc: null,
    engineOsc2: null,
    engineFilter: null,
    engineGain: null,
    windSource: null,
    windFilter: null,
    windGain: null,
    muted: false,
    started: false,
  };
}

export function ensureAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(ctx.destination);

    // Engine: two sawtooths, slightly detuned, through a low-pass.
    audio.engineFilter = ctx.createBiquadFilter();
    audio.engineFilter.type = 'lowpass';
    audio.engineFilter.frequency.value = 420;
    audio.engineFilter.connect(audio.master);
    audio.engineGain = ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineGain.connect(audio.engineFilter);
    audio.engineOsc = ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 70;
    audio.engineOsc.connect(audio.engineGain);
    audio.engineOsc.start();
    audio.engineOsc2 = ctx.createOscillator();
    audio.engineOsc2.type = 'sawtooth';
    audio.engineOsc2.frequency.value = 71.5;
    audio.engineOsc2.connect(audio.engineGain);
    audio.engineOsc2.start();

    // Wind: a looped noise buffer through a band-pass filter.
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    audio.windSource = ctx.createBufferSource();
    audio.windSource.buffer = buffer;
    audio.windSource.loop = true;
    audio.windFilter = ctx.createBiquadFilter();
    audio.windFilter.type = 'bandpass';
    audio.windFilter.frequency.value = 600;
    audio.windFilter.Q.value = 0.6;
    audio.windGain = ctx.createGain();
    audio.windGain.gain.value = 0;
    audio.windSource.connect(audio.windFilter);
    audio.windFilter.connect(audio.windGain);
    audio.windGain.connect(audio.master);
    audio.windSource.start();

    audio.started = true;
  } catch {
    // No audio on this machine: the game plays on silently.
    audio.started = false;
  }
}

// Called every frame while flying: the engine follows the throttle, the
// wind follows the speed.
export function updateEngineSound(audio, plane) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  const throttle = plane.throttle / 100;
  audio.engineOsc.frequency.setTargetAtTime(55 + throttle * 75, t, 0.08);
  audio.engineOsc2.frequency.setTargetAtTime(56 + throttle * 76, t, 0.08);
  audio.engineGain.gain.setTargetAtTime(plane.airborne || plane.speed > 10 ? 0.05 + throttle * 0.1 : 0.02, t, 0.1);
  audio.engineFilter.frequency.setTargetAtTime(300 + throttle * 900, t, 0.1);
  const windLevel = Math.min(plane.speed / 340, 1) * 0.12;
  audio.windGain.gain.setTargetAtTime(plane.airborne ? windLevel : 0, t, 0.15);
}

function blip(audio, freq, dur, type, gain, when = 0) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(audio.master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playRingChime(audio) {
  blip(audio, 880, 0.35, 'sine', 0.25);
  blip(audio, 1318, 0.4, 'sine', 0.2, 0.07);
}

export function playThud(audio) {
  blip(audio, 70, 0.3, 'sine', 0.4);
}

export function playCrash(audio) {
  blip(audio, 55, 0.7, 'sawtooth', 0.35);
  blip(audio, 40, 0.9, 'sine', 0.4, 0.05);
}

export function playWin(audio) {
  [523, 659, 784, 1047].forEach((f, i) => blip(audio, f, 0.5, 'sine', 0.22, i * 0.12));
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}
