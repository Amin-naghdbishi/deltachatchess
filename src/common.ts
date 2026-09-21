// @ts-check
import m from "mithril";
import { Chess } from "chess.js";
import { ChessClock } from "./clock";
import { VariantId, VARIANTS, createInitialVariantState, VariantRuntimeState } from "./variants";
import { getSettings, InPersonOrientationMode, getUserName } from "./settings";

export type AppView =
  | "home"
  | "play-person"
  | "play-online"
  | "game"
  | "history"
  | "history-review"
  | "settings";

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: "w" | "b";
  captured?: string;
}

export interface OnlineChallenge {
  id: string;
  creatorAddr: string;
  creatorName: string;
  variantId: VariantId;
  timeControlSeconds: number;
  timeControlIncrement: number;
  timeControlLabel: string;
  preferredColor: "white" | "black" | "random";
  createdAt: number;
}

export interface GameState {
  currentView: AppView;
  gameMode: "person" | "online";

  // Game core
  game: InstanceType<typeof Chess>;
  board: any; // Chessboard.js instance
  variantId: VariantId;
  variantState: VariantRuntimeState;
  initialFen: string;

  // In-Person Orientation ("none" | "flip" | "rotate")
  orientationMode: InPersonOrientationMode;

  // Players
  whiteAddr: string | null;
  whiteName: string;
  blackAddr: string | null;
  blackName: string;
  spectators: Array<{ addr: string; name: string }>;

  // Clocks
  clock: ChessClock;
  timeControlLabel: string;

  // Move tracking
  lastMove: { from: string; to: string } | null;
  selectedSquare: string | null;
  moveHistory: MoveRecord[];
  fenHistory: string[];
  capturedByWhite: string[]; // Black pieces captured by White
  capturedByBlack: string[]; // White pieces captured by Black

  // Status & Outcomes
  isGameOver: boolean;
  winner: "w" | "b" | "draw" | null;
  resultReason: string;
  drawOfferAddr: string | null;
  surrenderAddr: string | null;

  // Review mode
  inReplayMode: boolean;
  reviewGameEntry: any | null;
  reviewStep: number;

  // WebXDC Online Lobby
  openChallenges: OnlineChallenge[];
  activeGameId: string | null;

  // UI modal states
  pendingPromotion: { from: string; to: string } | null;
  showMovesDrawer: boolean;
  showSettingsModal: boolean;
}

export const state: GameState = {
  currentView: "home",
  gameMode: "person",

  game: new Chess(),
  board: null,
  variantId: "standard",
  variantState: createInitialVariantState(),
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",

  orientationMode: "none",

  whiteAddr: null,
  whiteName: "White",
  blackAddr: null,
  blackName: "Black",
  spectators: [],

  clock: new ChessClock(0, 0),
  timeControlLabel: "No Clock",

  lastMove: null,
  selectedSquare: null,
  moveHistory: [],
  fenHistory: [],
  capturedByWhite: [],
  capturedByBlack: [],

  isGameOver: false,
  winner: null,
  resultReason: "",
  drawOfferAddr: null,
  surrenderAddr: null,

  inReplayMode: false,
  reviewGameEntry: null,
  reviewStep: 0,

  openChallenges: [],
  activeGameId: null,

  pendingPromotion: null,
  showMovesDrawer: false,
  showSettingsModal: false,
};

export function normalizeName(name?: string | null): string {
  if (!name) return "Player";
  return name.length > 15 ? name.substring(0, 15) + "…" : name;
}

export function switchView(newView: AppView) {
  state.currentView = newView;
  state.showMovesDrawer = false;
  state.showSettingsModal = false;
  if (newView !== "game" && newView !== "history-review") {
    state.board = null;
    state.selectedSquare = null;
  }
}

export function calculateCapturedPieces(game: InstanceType<typeof Chess>) {
  const startingCount: Record<string, number> = {
    P: 8,
    N: 2,
    B: 2,
    R: 2,
    Q: 1,
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
  };

  const currentCount: Record<string, number> = {};
  const board = game.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq) {
        const key = sq.color === "w" ? sq.type.toUpperCase() : sq.type.toLowerCase();
        currentCount[key] = (currentCount[key] || 0) + 1;
      }
    }
  }

  const byWhite: string[] = [];
  const byBlack: string[] = [];

  ["p", "n", "b", "r", "q"].forEach((p) => {
    const missing = (startingCount[p] || 0) - (currentCount[p] || 0);
    for (let i = 0; i < missing; i++) {
      byWhite.push(p);
    }
  });

  ["P", "N", "B", "R", "Q"].forEach((p) => {
    const missing = (startingCount[p] || 0) - (currentCount[p] || 0);
    for (let i = 0; i < missing; i++) {
      byBlack.push(p.toLowerCase());
    }
  });

  state.capturedByWhite = byWhite;
  state.capturedByBlack = byBlack;
}

export function resetGame(
  variantId: VariantId = "standard",
  initialSeconds = 0,
  incrementSeconds = 0,
  timeControlLabel = "No Clock",
  mode: "person" | "online" = "person",
  orientationMode: InPersonOrientationMode = getSettings().inPersonOrientation,
) {
  state.variantId = variantId;
  const def = VARIANTS[variantId] || VARIANTS.standard;
  state.initialFen = def.getInitialFen();

  state.game = new Chess(state.initialFen);
  state.variantState = createInitialVariantState();

  if (state.clock) {
    state.clock.stop();
  }

  state.clock = new ChessClock(
    initialSeconds,
    incrementSeconds,
    (timedOutColor) => {
      handleTimeOut(timedOutColor);
      m.redraw();
    },
    () => {
      if (state.currentView === "game") {
        m.redraw();
      }
    },
  );
  state.timeControlLabel = timeControlLabel;

  state.gameMode = mode;
  state.orientationMode = orientationMode;
  state.lastMove = null;
  state.selectedSquare = null;
  state.moveHistory = [];
  state.fenHistory = [state.initialFen];
  state.capturedByWhite = [];
  state.capturedByBlack = [];

  state.isGameOver = false;
  state.winner = null;
  state.resultReason = "";
  state.drawOfferAddr = null;
  state.surrenderAddr = null;
  state.inReplayMode = false;
  state.pendingPromotion = null;
  state.showMovesDrawer = false;
  state.showSettingsModal = false;
}

export function handleTimeOut(timedOutColor: "w" | "b") {
  if (state.isGameOver) return;
  state.isGameOver = true;
  state.winner = timedOutColor === "w" ? "b" : "w";
  state.resultReason = `${timedOutColor === "w" ? state.whiteName : state.blackName} ran out of time! ⏱️`;
}
