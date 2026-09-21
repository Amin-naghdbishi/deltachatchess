// @ts-check

export type ThemeMode = "dark" | "light" | "system";
export type RetentionPolicy = "1week" | "1month" | "never";
export type InPersonOrientationMode = "none" | "flip" | "rotate";

export interface ChessThemePalette {
  id: string;
  name: string;
  isCustom?: boolean;
  bgPrimary: string;
  bgSurface: string;
  textPrimary: string;
  textSecondary: string;
  boardLight: string;
  boardDark: string;
  accent: string;
  sqSelected: string;
  sqLegalDot: string;
  sqLastMove: string;
}

export const BUILTIN_THEMES: Record<string, ChessThemePalette> = {
  green: {
    id: "green",
    name: "Modern Green",
    bgPrimary: "#161512",
    bgSurface: "#21201d",
    textPrimary: "#f0f0f0",
    textSecondary: "#9e9c98",
    boardLight: "#eeeed2",
    boardDark: "#769656",
    accent: "#81b64c",
    sqSelected: "rgba(247, 247, 105, 0.55)",
    sqLegalDot: "rgba(20, 85, 30, 0.35)",
    sqLastMove: "rgba(245, 246, 130, 0.45)",
  },
  classic: {
    id: "classic",
    name: "Classic Wood",
    bgPrimary: "#1a1613",
    bgSurface: "#28231f",
    textPrimary: "#f5f0eb",
    textSecondary: "#a89f91",
    boardLight: "#f0d9b5",
    boardDark: "#b58863",
    accent: "#d49b4b",
    sqSelected: "rgba(205, 160, 80, 0.55)",
    sqLegalDot: "rgba(100, 60, 20, 0.35)",
    sqLastMove: "rgba(215, 180, 110, 0.45)",
  },
  slate: {
    id: "slate",
    name: "Charcoal Slate",
    bgPrimary: "#121316",
    bgSurface: "#1d2026",
    textPrimary: "#e2e8f0",
    textSecondary: "#94a3b8",
    boardLight: "#cbd5e1",
    boardDark: "#64748b",
    accent: "#38bdf8",
    sqSelected: "rgba(56, 189, 248, 0.45)",
    sqLegalDot: "rgba(15, 23, 42, 0.35)",
    sqLastMove: "rgba(56, 189, 248, 0.35)",
  },
  ocean: {
    id: "ocean",
    name: "Ocean Blue",
    bgPrimary: "#0d1821",
    bgSurface: "#172534",
    textPrimary: "#e0f2fe",
    textSecondary: "#7dd3fc",
    boardLight: "#dee3e6",
    boardDark: "#608098",
    accent: "#0ea5e9",
    sqSelected: "rgba(14, 165, 233, 0.5)",
    sqLegalDot: "rgba(12, 74, 110, 0.35)",
    sqLastMove: "rgba(56, 189, 248, 0.4)",
  },
  walnut: {
    id: "walnut",
    name: "Warm Walnut",
    bgPrimary: "#14110e",
    bgSurface: "#231d18",
    textPrimary: "#fcf8f2",
    textSecondary: "#b8a99a",
    boardLight: "#edd8b7",
    boardDark: "#94633b",
    accent: "#e09040",
    sqSelected: "rgba(224, 144, 64, 0.5)",
    sqLegalDot: "rgba(70, 35, 10, 0.35)",
    sqLastMove: "rgba(224, 170, 100, 0.45)",
  },
  minimal: {
    id: "minimal",
    name: "Monochrome Minimal",
    bgPrimary: "#0a0a0a",
    bgSurface: "#171717",
    textPrimary: "#f5f5f5",
    textSecondary: "#737373",
    boardLight: "#e5e5e5",
    boardDark: "#525252",
    accent: "#a3a3a3",
    sqSelected: "rgba(255, 255, 255, 0.4)",
    sqLegalDot: "rgba(0, 0, 0, 0.35)",
    sqLastMove: "rgba(200, 200, 200, 0.35)",
  },
};

export type PieceStyleId =
  "standard" | "modern" | "staunton" | "merida" | "alpha";

export interface PieceStyleOption {
  id: PieceStyleId;
  name: string;
  description: string;
  previewWhite: string;
  previewBlack: string;
}

export const PIECE_STYLES: Record<PieceStyleId, PieceStyleOption> = {
  standard: {
    id: "standard",
    name: "Classic / Standard",
    description: "Classic tournament standard",
    previewWhite: "wN",
    previewBlack: "bK",
  },
  modern: {
    id: "modern",
    name: "Modern / Minimal",
    description: "Sleek geometric minimalism",
    previewWhite: "wN",
    previewBlack: "bK",
  },
  staunton: {
    id: "staunton",
    name: "Staunton",
    description: "Authentic Staunton pattern",
    previewWhite: "wN",
    previewBlack: "bK",
  },
  merida: {
    id: "merida",
    name: "Traditional Merida",
    description: "Refined, iconic chess set",
    previewWhite: "wN",
    previewBlack: "bK",
  },
  alpha: {
    id: "alpha",
    name: "Graceful Alpha",
    description: "Clean and subtle elegance",
    previewWhite: "wN",
    previewBlack: "bK",
  },
};

export interface AppSettings {
  activeThemeId: string;
  pieceStyle: PieceStyleId;
  inPersonOrientation: InPersonOrientationMode;
  showCoordinates: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  animationEnabled: boolean;
  themeMode: ThemeMode;
  recordHistory: boolean;
  historyRetention: RetentionPolicy;
}

const SETTINGS_KEY = "deltachat_chess_settings_v2";
const CUSTOM_THEMES_KEY = "deltachat_chess_custom_themes_v2";
const USERNAME_KEY = "deltachat_chess_username_v2";

const DEFAULT_SETTINGS: AppSettings = {
  activeThemeId: "green",
  pieceStyle: "standard",
  inPersonOrientation: "none",
  showCoordinates: true,
  soundEnabled: true,
  soundVolume: 0.8,
  animationEnabled: true,
  themeMode: "dark",
  recordHistory: true,
  historyRetention: "never",
};

export function getPieceImagePath(piece: string, style?: PieceStyleId): string {
  const currentStyle = style || getSettings().pieceStyle || "standard";
  return `/pieces/${currentStyle}/${piece}.svg`;
}

let cachedSettings: AppSettings | null = null;
let cachedCustomThemes: ChessThemePalette[] | null = null;

// ================= USERNAME =================
export function getUserName(): string {
  try {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved && saved.trim().length > 0) return saved.trim();
    if (
      typeof window !== "undefined" &&
      window.webxdc &&
      window.webxdc.selfName
    ) {
      return window.webxdc.selfName;
    }
  } catch (e) {
    // ignore
  }
  return "Archer";
}

export function saveUserName(name: string): string {
  const clean = (name || "").trim() || "Archer";
  try {
    localStorage.setItem(USERNAME_KEY, clean);
  } catch (e) {
    console.error("Failed to save username:", e);
  }
  return clean;
}

// ================= CUSTOM THEMES =================
export function getCustomThemes(): ChessThemePalette[] {
  if (cachedCustomThemes) return cachedCustomThemes;
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (raw) {
      cachedCustomThemes = JSON.parse(raw);
    } else {
      cachedCustomThemes = [];
    }
  } catch (e) {
    cachedCustomThemes = [];
  }
  return cachedCustomThemes || [];
}

export function saveCustomTheme(theme: ChessThemePalette): ChessThemePalette[] {
  const themes = getCustomThemes().filter((t) => t.id !== theme.id);
  const updated = [...themes, { ...theme, isCustom: true }];
  cachedCustomThemes = updated;
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom theme:", e);
  }
  return updated;
}

export function deleteCustomTheme(themeId: string): ChessThemePalette[] {
  const updated = getCustomThemes().filter((t) => t.id !== themeId);
  cachedCustomThemes = updated;
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete custom theme:", e);
  }

  // If deleted theme was active, switch to default green
  if (getSettings().activeThemeId === themeId) {
    saveSettings({ activeThemeId: "green" });
  }
  return updated;
}

export function findTheme(id: string): ChessThemePalette {
  if (BUILTIN_THEMES[id]) return BUILTIN_THEMES[id];
  const custom = getCustomThemes().find((t) => t.id === id);
  if (custom) return custom;
  return BUILTIN_THEMES.green;
}

// ================= SETTINGS =================
export function getSettings(): AppSettings {
  if (cachedSettings) return cachedSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch (e) {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return cachedSettings;
}

export function saveSettings(newSettings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  cachedSettings = updated;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to persist settings:", e);
  }
  applySettingsToDOM(updated);
  return updated;
}

export function applySettingsToDOM(settings = getSettings()) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = findTheme(settings.activeThemeId);

  // Apply CSS custom properties dynamically across UI and board
  root.style.setProperty("--bg-primary", theme.bgPrimary);
  root.style.setProperty("--bg-surface", theme.bgSurface);
  root.style.setProperty("--text-primary", theme.textPrimary);
  root.style.setProperty("--text-secondary", theme.textSecondary);
  root.style.setProperty("--board-light", theme.boardLight);
  root.style.setProperty("--board-dark", theme.boardDark);
  root.style.setProperty("--accent-primary", theme.accent);
  root.style.setProperty("--sq-selected", theme.sqSelected);
  root.style.setProperty("--sq-legal-dot", theme.sqLegalDot);
  root.style.setProperty("--sq-lastmove", theme.sqLastMove);

  // Coordinates visibility
  if (settings.showCoordinates) {
    root.classList.remove("hide-coords");
  } else {
    root.classList.add("hide-coords");
  }

  // Animation toggle
  if (settings.animationEnabled) {
    root.classList.remove("no-anim");
  } else {
    root.classList.add("no-anim");
  }

  // Dark / Light class helper
  const isDark =
    settings.themeMode === "dark" ||
    (settings.themeMode === "system" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark-mode");
    root.classList.remove("light-mode");
  } else {
    root.classList.add("light-mode");
    root.classList.remove("dark-mode");
  }
}
