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

    // Wood tap sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

    gain.gain.setValueAtTime(0.4 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);

    // Subtle noise transient for wood strike
    this.playNoise(t, 0.025, 0.25 * vol, 800);
  }

  playCapture() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Main impact
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(320, t);
    osc1.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain1.gain.setValueAtTime(0.6 * vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.1);

    // Secondary body knock
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(160, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.11);

    gain2.gain.setValueAtTime(0.4 * vol, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t + 0.02);
    osc2.stop(t + 0.13);

    this.playNoise(t, 0.04, 0.35 * vol, 1400);
  }

  playCastle() {
    if (!this.canPlay()) return;
    this.playMove();
    setTimeout(() => {
      this.playMove();
    }, 90);
  }

  playCheck() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Alert double tone
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.35 * vol, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.32);
    });
  }

  playCheckmate() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Resonant resolving chord: C4, E4, G4, C5
    [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.3 * vol, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.85);
    });
  }

  playPromotion() {
    if (!this.canPlay()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.getMasterVolume();

    // Ascending arpeggio: G4, C5, E5, G5
    [392.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.3 * vol, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.26);
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

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0.25 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
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
