// @ts-check
import { getSettings } from "./settings";

export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "checkmate"
  | "castle"
  | "promote"
  | "game-start"
  | "game-end";

const SOUND_EXTENSIONS = [".wav", ".mp3", ".ogg", ".webm"];
const ALL_SOUND_NAMES: SoundName[] = [
  "move",
  "capture",
  "check",
  "checkmate",
  "castle",
  "promote",
  "game-start",
  "game-end",
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private audioBuffers: Map<SoundName, AudioBuffer> = new Map();
  private audioElements: Map<SoundName, HTMLAudioElement> = new Map();
  private isPreloading: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.preloadAll();
      }, 100);
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private canPlay(): boolean {
    const s = getSettings();
    return s.soundEnabled && s.soundVolume > 0;
  }

  private getMasterVolume(): number {
    const s = getSettings();
    return Math.max(0, Math.min(1, s.soundVolume));
  }

  /**
   * Preload audio files from sounds/ directory supporting .mp3, .wav, .ogg, .webm
   */
  async preloadAll() {
    if (this.isPreloading || typeof window === "undefined") return;
    this.isPreloading = true;

    for (const name of ALL_SOUND_NAMES) {
      this.loadSound(name).catch(() => {});
    }
  }

  private async loadSound(name: SoundName): Promise<boolean> {
    const candidateBases = [`./sounds/${name}`, `sounds/${name}`];

    // Priority: .mp3 -> .wav -> .ogg -> .webm
    const extensions = [".mp3", ".wav", ".ogg", ".webm"];

    for (const ext of extensions) {
      for (const base of candidateBases) {
        const url = `${base}${ext}`;
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const ctx = this.getContext();
            if (ctx) {
              const buffer = await ctx.decodeAudioData(arrayBuffer);
              this.audioBuffers.set(name, buffer);
              return true;
            }
          }
        } catch (e) {
          // Try next extension or fallback to Audio element
        }
      }
    }

    // HTMLAudioElement fallback
    try {
      const audio = new Audio();
      for (const ext of extensions) {
        const source = document.createElement("source");
        source.src = `./sounds/${name}${ext}`;
        if (ext === ".mp3") source.type = "audio/mpeg";
        else if (ext === ".wav") source.type = "audio/wav";
        else if (ext === ".ogg") source.type = "audio/ogg";
        else if (ext === ".webm") source.type = "audio/webm";
        audio.appendChild(source);
      }
      this.audioElements.set(name, audio);
      return true;
    } catch (e) {
      return false;
    }
  }

  private playFileOrSynth(name: SoundName, synthFallback: () => void) {
    if (!this.canPlay()) return;

    const vol = this.getMasterVolume();

    // 1. Try decoded AudioBuffer via Web Audio API (fastest, 0ms latency)
    const buffer = this.audioBuffers.get(name);
    if (buffer) {
      const ctx = this.getContext();
      if (ctx) {
        try {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(vol, ctx.currentTime);
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(0);
          return;
        } catch (e) {
          // fallback
        }
      }
    }

    // 2. Try HTMLAudioElement
    const audio = this.audioElements.get(name);
    if (audio) {
      try {
        const clone = audio.cloneNode(true) as HTMLAudioElement;
        clone.volume = vol;
        const promise = clone.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
            synthFallback();
          });
        }
        return;
      } catch (e) {
        // fallback
      }
    }

    // 3. Synthesizer fallback
    synthFallback();
  }

  // --- Public API ---

  playMove() {
    this.playFileOrSynth("move", () => this.synthMove());
  }

  playCapture() {
    this.playFileOrSynth("capture", () => this.synthCapture());
  }

  playCheck() {
    this.playFileOrSynth("check", () => this.synthCheck());
  }

  playCheckmate() {
    this.playFileOrSynth("checkmate", () => this.synthCheckmate());
  }

  playCastle() {
    this.playFileOrSynth("castle", () => this.synthCastle());
  }

  playPromotion() {
    this.playFileOrSynth("promote", () => this.synthPromotion());
  }

  playGameStart() {
    this.playFileOrSynth("game-start", () => this.synthGameStart());
  }

  playGameEnd() {
    this.playFileOrSynth("game-end", () => this.synthGameEnd());
  }

  playLowTime() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1046.5, t);

    gain.gain.setValueAtTime(0.55 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- Procedural Synthesizers (Used as Fallbacks) ---

  private synthMove() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    this.playNoise(t, 0.035, 0.65 * vol, 2200);

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(360, t);
    osc1.frequency.exponentialRampToValueAtTime(110, t + 0.08);

    gain1.gain.setValueAtTime(0.85 * vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.11);
  }

  private synthCapture() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    this.playNoise(t, 0.035, 0.8 * vol, 2800);

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(480, t);
    osc1.frequency.exponentialRampToValueAtTime(130, t + 0.07);

    gain1.gain.setValueAtTime(0.9 * vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);
  }

  private synthCastle() {
    this.synthMove();
    setTimeout(() => {
      this.synthMove();
    }, 110);
  }

  private synthCheck() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    const tones = [
      { freq: 783.99, delay: 0.0, dur: 0.38 },
      { freq: 1046.5, delay: 0.07, dur: 0.45 },
    ];

    tones.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.65 * vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + delay);
      osc.stop(t + delay + dur + 0.02);
    });
  }

  private synthCheckmate() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    this.synthMove();

    const chord = [
      { freq: 261.63, delay: 0.04, dur: 1.1 },
      { freq: 392.0, delay: 0.08, dur: 1.2 },
      { freq: 523.25, delay: 0.12, dur: 1.3 },
      { freq: 659.25, delay: 0.16, dur: 1.4 },
      { freq: 783.99, delay: 0.2, dur: 1.5 },
    ];

    chord.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.45 * vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + delay);
      osc.stop(t + delay + dur + 0.05);
    });
  }

  private synthPromotion() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.55 * vol, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.38);
    });
  }

  private synthGameStart() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    [523.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.55 * vol, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.48);
    });
  }

  private synthGameEnd() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    [329.63, 220.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.14);

      gain.gain.setValueAtTime(0.55 * vol, t + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 0.8);
    });
  }

  private playNoise(
    startTime: number,
    duration: number,
    volume: number,
    filterFreq: number,
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + duration);
  }
}

export const sound = new SoundManager();

