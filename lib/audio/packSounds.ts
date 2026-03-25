/**
 * Короткие звуки открытия пака через Web Audio API (без внешних файлов).
 * Разблокировка контекста — в том же пользовательском жесте, что и открытие.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedCtx;
}

/** Вызвать синхронно из обработчика клика до любых await. */
export function ensureAudioUnlocked(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume();
  }
}

async function getRunningContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === "running" ? ctx : null;
}

function connectOut(
  ctx: AudioContext,
  node: AudioNode,
  gain: GainNode,
  when: number,
  peak: number,
  releaseSec: number,
) {
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + releaseSec);
  node.connect(gain);
  gain.connect(ctx.destination);
}

/** Лёгкий «шух» при старте загрузки пака. */
export async function playPackLoadingSound(): Promise<void> {
  const ctx = await getRunningContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.07);
  connectOut(ctx, osc, g, t, 0.045, 0.1);
  osc.start(t);
  osc.stop(t + 0.12);
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const fade = 1 - i / n;
    d[i] = (Math.random() * 2 - 1) * fade * fade;
  }
  return buf;
}

function connectPanned(
  ctx: AudioContext,
  source: AudioNode,
  gain: GainNode,
  pan: number,
): void {
  const sp = ctx.createStereoPanner?.();
  if (sp) {
    sp.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain);
    gain.connect(sp);
    sp.connect(ctx.destination);
  } else {
    source.connect(gain);
    gain.connect(ctx.destination);
  }
}

/** Разрыв обёртки / рвётся пак. При rare+ — ярче шум, выше свип, короткие «искры». */
export async function playPackTearSound(
  hasRarePlus: boolean,
): Promise<void> {
  const ctx = await getRunningContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  const buf = noiseBuffer(ctx, hasRarePlus ? 0.62 : 0.55);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = hasRarePlus ? 1.45 : 1.2;
  const hi = hasRarePlus ? 1150 : 900;
  const lo = hasRarePlus ? 240 : 180;
  filter.frequency.setValueAtTime(hi, t);
  filter.frequency.exponentialRampToValueAtTime(lo, t + (hasRarePlus ? 0.52 : 0.48));
  const g = ctx.createGain();
  const peak = hasRarePlus ? 0.26 : 0.22;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (hasRarePlus ? 0.58 : 0.52));
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(t);

  const click = ctx.createOscillator();
  const cg = ctx.createGain();
  click.type = "square";
  click.frequency.setValueAtTime(hasRarePlus ? 118 : 95, t);
  click.frequency.exponentialRampToValueAtTime(hasRarePlus ? 52 : 45, t + 0.06);
  connectOut(ctx, click, cg, t, hasRarePlus ? 0.022 : 0.018, 0.09);
  click.start(t);
  click.stop(t + 0.1);

  if (hasRarePlus) {
    const sparkFreqs = [523.25, 783.99, 987.77];
    sparkFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const sg = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t + i * 0.018);
      const start = t + 0.05 + i * 0.022;
      sg.gain.setValueAtTime(0.0001, start);
      sg.gain.exponentialRampToValueAtTime(0.04, start + 0.012);
      sg.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      connectPanned(ctx, osc, sg, i === 0 ? -0.4 : i === 1 ? 0.15 : 0.45);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  }
}

/** «Дзинь» при вылете колоды: rare+ — шире по тону, панорама, лёгкий бас. */
export async function playPackRevealSound(
  hadRarePlus: boolean,
): Promise<void> {
  const ctx = await getRunningContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = hadRarePlus ? 415.3 : 329.63; // G#4 vs E4
  const freqs = hadRarePlus
    ? [base, base * 1.189, base * 1.498, base * 1.888, base * 2.378]
    : [base, base * 1.26, base * 1.5];
  const step = hadRarePlus ? 0.048 : 0.065;
  const peak = hadRarePlus ? 0.065 : 0.052;
  const tail = hadRarePlus ? 0.36 : 0.28;

  if (hadRarePlus) {
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(82.4, t);
    subG.gain.setValueAtTime(0.0001, t);
    subG.gain.exponentialRampToValueAtTime(0.055, t + 0.04);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    sub.connect(subG);
    subG.connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.45);
  }

  const pans = hadRarePlus ? [-0.55, -0.2, 0.1, 0.38, 0.62] : [0, 0, 0];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = hadRarePlus && i >= 2 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(f, t + i * step);
    const start = t + i * step;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.022);
    g.gain.exponentialRampToValueAtTime(0.0001, start + tail);
    const pan = hadRarePlus ? (pans[i] ?? 0) : 0;
    if (hadRarePlus) {
      connectPanned(ctx, osc, g, pan);
    } else {
      osc.connect(g);
      g.connect(ctx.destination);
    }
    osc.start(start);
    osc.stop(start + tail + 0.06);
  });

  if (hadRarePlus) {
    const sh = noiseBuffer(ctx, 0.22);
    const shSrc = ctx.createBufferSource();
    shSrc.buffer = sh;
    const shF = ctx.createBiquadFilter();
    shF.type = "highpass";
    shF.frequency.value = 2800;
    const shEnv = ctx.createGain();
    shSrc.connect(shF);
    shF.connect(shEnv);
    const t0 = t + 0.02;
    shEnv.gain.setValueAtTime(0.0001, t0);
    shEnv.gain.exponentialRampToValueAtTime(0.028, t0 + 0.04);
    shEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    const sp = ctx.createStereoPanner?.();
    if (sp) {
      sp.pan.value = 0.38;
      shEnv.connect(sp);
      sp.connect(ctx.destination);
    } else {
      shEnv.connect(ctx.destination);
    }
    shSrc.start(t);
    shSrc.stop(t + 0.26);
  }
}
