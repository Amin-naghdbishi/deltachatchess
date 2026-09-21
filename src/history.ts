// @ts-check
import { getSettings } from "./settings";

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  mode: "person" | "online";
  whiteName: string;
  blackName: string;
  winner: "w" | "b" | "draw" | "abandoned";
  resultReason: string;
  variantId: string;
  variantName: string;
  timeControl: string;
  moves: string[]; // List of SAN moves (e.g. ["e4", "e5", "Nf3"...])
  fens: string[]; // Position FEN after each move (starting with initial FEN)
  pgn: string;
}

const HISTORY_STORAGE_KEY = "deltachat_chess_history_v1";

export function loadAllHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    let list: GameHistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Auto-prune based on settings retention policy
    list = pruneOldEntries(list);
    return list;
  } catch (e) {
    console.error("Failed to load history:", e);
    return [];
  }
}

function pruneOldEntries(entries: GameHistoryEntry[]): GameHistoryEntry[] {
  const settings = getSettings();
  if (settings.historyRetention === "never") return entries;

  const now = Date.now();
  let maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 1 week
  if (settings.historyRetention === "1month") {
    maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  }

  const pruned = entries.filter((item) => now - item.timestamp <= maxAgeMs);
  if (pruned.length !== entries.length) {
    saveRawHistory(pruned);
  }
  return pruned;
}

function saveRawHistory(entries: GameHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to write game history:", e);
  }
}

export function saveCompletedGame(
  entry: Omit<GameHistoryEntry, "id" | "timestamp" | "dateStr"> & {
    id?: string;
    timestamp?: number;
    dateStr?: string;
  },
): GameHistoryEntry | null {
  const settings = getSettings();
  if (!settings.recordHistory) {
    return null;
  }

  const list = loadAllHistory();
  // Prevent duplicate saving of the exact same game
  if (entry.id && list.some((g) => g.id === entry.id)) {
    return null;
  }

  const now = entry.timestamp || Date.now();
  const dateObj = new Date(now);
  const dateStr =
    entry.dateStr ||
    dateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fullEntry: GameHistoryEntry = {
    ...entry,
    id:
      entry.id ||
      "game_" + now + "_" + Math.random().toString(36).substring(2, 7),
    timestamp: now,
    dateStr,
  };

  list.unshift(fullEntry); // newest first

  // Cap at 100 recent games to protect local storage quota in WebXDC
  if (list.length > 100) {
    list.length = 100;
  }

  saveRawHistory(list);
  return fullEntry;
}

export function deleteGameById(id: string) {
  const list = loadAllHistory();
  const filtered = list.filter((g) => g.id !== id);
  saveRawHistory(filtered);
}

export function deleteGamesByIds(ids: string[]) {
  const idSet = new Set(ids);
  const list = loadAllHistory();
  const filtered = list.filter((g) => !idSet.has(g.id));
  saveRawHistory(filtered);
}

export function clearAllGameHistory() {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear game history:", e);
  }
}
