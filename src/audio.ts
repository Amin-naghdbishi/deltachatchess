// @ts-check
import { getSettings } from "./settings";

class SoundManager {
  private ctx: AudioContext | null = null;

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

  playMove() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // 1. Crisp wood impact transient
    this.playNoise(t, 0.035, 0.65 * vol, 2200);

    // 2. Primary body thock (quick pitch drop gives the solid wooden weight)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(360, t);
    osc1.frequency.exponentialRampToValueAtTime(110, t + 0.08);

    gain1.gain.setValueAtTime(0.85 * vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.11);

    // 3. Resonant low body knock
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(180, t);
    osc2.frequency.exponentialRampToValueAtTime(75, t + 0.09);

    gain2.gain.setValueAtTime(0.55 * vol, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.12);
  }

  playCapture() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Initial piece-on-piece click transient
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
    osc1.stop(t + 0.10);

    // Secondary board landing clatter (30ms later)
    const t2 = t + 0.035;
    this.playNoise(t2, 0.045, 0.65 * vol, 1600);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(240, t2);
    osc2.frequency.exponentialRampToValueAtTime(70, t2 + 0.11);

    gain2.gain.setValueAtTime(0.7 * vol, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.13);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.14);
  }

  playCastle() {
    if (!this.canPlay()) return;
    this.playMove();
    setTimeout(() => {
      this.playMove();
    }, 110);
  }

  playCheck() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Bright, elegant two-tone chime (G5 -> C6)
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

  playCheckmate() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Initial solid move impact
    this.playMove();

    // Resonant resolving triumph chord: C4, G4, C5, E5, G5
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

  playPromotion() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Ascending celebratory arpeggio: C5, E5, G5, C6
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
