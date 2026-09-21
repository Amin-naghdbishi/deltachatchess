// @ts-check
import { sound } from "./audio";

export interface TimeControlConfig {
  initialSeconds: number; // 0 for unlimited / no clock
  incrementSeconds: number;
  label: string;
  category: "bullet" | "blitz" | "rapid" | "classical" | "none" | "custom";
}

export const TIME_CONTROL_PRESETS: TimeControlConfig[] = [
  { initialSeconds: 0, incrementSeconds: 0, label: "No Clock", category: "none" },
  { initialSeconds: 60, incrementSeconds: 0, label: "1+0", category: "bullet" },
  { initialSeconds: 120, incrementSeconds: 1, label: "2+1", category: "bullet" },
  { initialSeconds: 180, incrementSeconds: 0, label: "3+0", category: "blitz" },
  { initialSeconds: 180, incrementSeconds: 2, label: "3+2", category: "blitz" },
  { initialSeconds: 300, incrementSeconds: 0, label: "5+0", category: "blitz" },
  { initialSeconds: 300, incrementSeconds: 3, label: "5+3", category: "blitz" },
  { initialSeconds: 600, incrementSeconds: 0, label: "10+0", category: "rapid" },
  { initialSeconds: 600, incrementSeconds: 5, label: "10+5", category: "rapid" },
  { initialSeconds: 900, incrementSeconds: 10, label: "15+10", category: "rapid" },
  { initialSeconds: 1800, incrementSeconds: 0, label: "30+0", category: "classical" },
];

/**
 * Robust, drift-free Chess Clock based on actual wall-clock timestamps (performance.now() / Date.now()).
 * Handles precise incremental time addition upon move completion, tab switching, and background throttling.
 */
export class ChessClock {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  incrementMs: number;
  activeColor: "w" | "b" | null = null;
  isRunning = false;
  turnStartTime: number = 0; // Timestamp (Date.now()) when the current turn started

  private intervalId: number | null = null;
  private onTimeoutCb?: (timedOutColor: "w" | "b") => void;
  private onTickCb?: () => void;
  private hasWarnedLowWhite = false;
  private hasWarnedLowBlack = false;
  private boundVisibilityHandler: () => void;

  constructor(
    initialSeconds: number = 0,
    incrementSeconds: number = 0,
    onTimeout?: (timedOutColor: "w" | "b") => void,
    onTick?: () => void,
  ) {
    this.whiteRemainingMs = Math.max(0, initialSeconds * 1000);
    this.blackRemainingMs = Math.max(0, initialSeconds * 1000);
    this.incrementMs = Math.max(0, incrementSeconds * 1000);
    this.onTimeoutCb = onTimeout;
    this.onTickCb = onTick;

    // Keep clock synchronized even if user switches browser tabs or background throttles
    this.boundVisibilityHandler = () => {
      this.syncAndCheckTimeout();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  isUnlimited(): boolean {
    return this.whiteRemainingMs <= 0 && this.incrementMs <= 0;
  }

  /**
   * Returns exact remaining milliseconds for a given player based on real wall-clock elapsed time.
   */
  getRemainingMs(color: "w" | "b"): number {
    if (this.isUnlimited()) return 0;

    const base = color === "w" ? this.whiteRemainingMs : this.blackRemainingMs;
    if (this.isRunning && this.activeColor === color) {
      const elapsed = Math.max(0, Date.now() - this.turnStartTime);
      return Math.max(0, base - elapsed);
    }
    return base;
  }

  /**
   * Starts clock for the specified player.
   */
  start(color: "w" | "b") {
    if (this.isUnlimited()) return;
    this.activeColor = color;
    this.isRunning = true;
    this.turnStartTime = Date.now();
    this.startTicker();
  }

  /**
   * Switches turn from current player to the other player.
   * 1. Calculates exact elapsed time since turn start
   * 2. Deducts it from current player's remaining time
   * 3. Adds increment to the player who just moved
   * 4. Updates active player and starts new timestamp
   */
  switchTurn(newColor: "w" | "b") {
    if (this.isUnlimited()) {
      this.activeColor = newColor;
      return;
    }

    const now = Date.now();
    if (this.isRunning && this.activeColor) {
      const elapsed = Math.max(0, now - this.turnStartTime);
      if (this.activeColor === "w") {
        this.whiteRemainingMs = Math.max(0, this.whiteRemainingMs - elapsed);
        if (this.whiteRemainingMs > 0 && this.incrementMs > 0) {
          this.whiteRemainingMs += this.incrementMs;
        }
      } else {
        this.blackRemainingMs = Math.max(0, this.blackRemainingMs - elapsed);
        if (this.blackRemainingMs > 0 && this.incrementMs > 0) {
          this.blackRemainingMs += this.incrementMs;
        }
      }
    }

    // Check if previous player timed out right as they moved
    if (this.checkTimeout()) {
      return;
    }

    this.activeColor = newColor;
    this.turnStartTime = now;
    if (!this.isRunning) {
      this.isRunning = true;
    }
    this.startTicker();
  }

  pause() {
    if (!this.isRunning || this.isUnlimited()) return;
    const now = Date.now();
    if (this.activeColor === "w") {
      const elapsed = Math.max(0, now - this.turnStartTime);
      this.whiteRemainingMs = Math.max(0, this.whiteRemainingMs - elapsed);
    } else if (this.activeColor === "b") {
      const elapsed = Math.max(0, now - this.turnStartTime);
      this.blackRemainingMs = Math.max(0, this.blackRemainingMs - elapsed);
    }
    this.isRunning = false;
    this.stopTicker();
  }

  resume() {
    if (this.isRunning || this.isUnlimited() || !this.activeColor) return;
    this.isRunning = true;
    this.turnStartTime = Date.now();
    this.startTicker();
  }

  stop() {
    this.isRunning = false;
    this.stopTicker();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  private startTicker() {
    this.stopTicker();
    // 100ms interval purely for UI redraw frequency, time calculation itself is absolute Date.now()
    this.intervalId = window.setInterval(() => {
      this.syncAndCheckTimeout();
    }, 100);
  }

  private stopTicker() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private syncAndCheckTimeout() {
    if (!this.isRunning || !this.activeColor || this.isUnlimited()) return;

    const remaining = this.getRemainingMs(this.activeColor);

    // Subtle low-time audio warning at 10 seconds
    if (this.activeColor === "w") {
      if (remaining <= 10000 && !this.hasWarnedLowWhite && remaining > 0) {
        this.hasWarnedLowWhite = true;
        sound.playLowTime();
      }
    } else {
      if (remaining <= 10000 && !this.hasWarnedLowBlack && remaining > 0) {
        this.hasWarnedLowBlack = true;
        sound.playLowTime();
      }
    }

    if (remaining <= 0) {
      this.checkTimeout();
    }

    if (this.onTickCb) {
      this.onTickCb();
    }
  }

  checkTimeout(): boolean {
    if (!this.isRunning || this.isUnlimited() || !this.activeColor) return false;

    const remaining = this.getRemainingMs(this.activeColor);
    if (remaining <= 0) {
      const timedOut = this.activeColor;
      if (timedOut === "w") this.whiteRemainingMs = 0;
      else this.blackRemainingMs = 0;

      this.stop();
      if (this.onTimeoutCb) {
        this.onTimeoutCb(timedOut);
      }
      return true;
    }
    return false;
  }

  getFormattedTime(color: "w" | "b"): string {
    if (this.isUnlimited()) return "∞";

    const ms = this.getRemainingMs(color);
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    // Show tenths of a second when under 10 seconds for blitz precision
    if (ms < 10000 && ms > 0) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${secs}.${tenths}`;
    }

    const padSec = secs < 10 ? `0${secs}` : `${secs}`;
    const padMin = mins < 10 ? `0${mins}` : `${mins}`;
    return `${padMin}:${padSec}`;
  }

  isLowTime(color: "w" | "b"): boolean {
    if (this.isUnlimited()) return false;
    return this.getRemainingMs(color) < 20000;
  }
}
