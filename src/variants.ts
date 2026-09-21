// @ts-check
import { Chess } from "chess.js";

export type VariantId =
  | "standard"
  | "chess960"
  | "kingOfTheHill"
  | "threeCheck"
  | "antichess"
  | "atomic"
  | "horde"
  | "racingKings";

export interface VariantDefinition {
  id: VariantId;
  name: string;
  subtitle: string;
  description: string;
  isFullyPlayable: boolean;
  getInitialFen: () => string;
  checkSpecialGameOver?: (
    game: InstanceType<typeof Chess>,
    extraState: VariantRuntimeState,
  ) => { isOver: boolean; winner?: "w" | "b" | "draw"; reason?: string };
}

export interface VariantRuntimeState {
  whiteChecksDelivered: number;
  blackChecksDelivered: number;
}

export function createInitialVariantState(): VariantRuntimeState {
  return {
    whiteChecksDelivered: 0,
    blackChecksDelivered: 0,
  };
}

/**
 * Generates a valid Fischer Random / Chess960 back-rank layout:
 * - Bishops must be on opposite colors.
 * - King must be between the two Rooks (to permit castling).
 */
export function generateChess960Fen(): string {
  const pieces = new Array(8).fill(null);

  // 1. Place Light-squared Bishop (at 1, 3, 5, 7)
  const lightSquares = [1, 3, 5, 7];
  const b1 = lightSquares[Math.floor(Math.random() * lightSquares.length)];
  pieces[b1] = "B";

  // 2. Place Dark-squared Bishop (at 0, 2, 4, 6)
  const darkSquares = [0, 2, 4, 6];
  const b2 = darkSquares[Math.floor(Math.random() * darkSquares.length)];
  pieces[b2] = "B";

  // 3. Place Queen on one of the 6 remaining empty squares
  const emptyAfterB = [];
  for (let i = 0; i < 8; i++) {
    if (!pieces[i]) emptyAfterB.push(i);
  }
  const qPos = emptyAfterB[Math.floor(Math.random() * emptyAfterB.length)];
  pieces[qPos] = "Q";

  // 4. Place Knights on two of the 5 remaining empty squares
  const emptyAfterQ = [];
  for (let i = 0; i < 8; i++) {
    if (!pieces[i]) emptyAfterQ.push(i);
  }
  const n1Idx = Math.floor(Math.random() * emptyAfterQ.length);
  const n1Pos = emptyAfterQ.splice(n1Idx, 1)[0];
  const n2Pos = emptyAfterQ[Math.floor(Math.random() * emptyAfterQ.length)];
  pieces[n1Pos] = "N";
  pieces[n2Pos] = "N";

  // 5. The remaining 3 empty squares MUST be Rook, King, Rook in that order
  const remaining = [];
  for (let i = 0; i < 8; i++) {
    if (!pieces[i]) remaining.push(i);
  }
  pieces[remaining[0]] = "R";
  pieces[remaining[1]] = "K";
  pieces[remaining[2]] = "R";

  const whiteRank = pieces.join("");
  const blackRank = whiteRank.toLowerCase();

  return `${blackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteRank} w KQkq - 0 1`;
}

export const VARIANTS: Record<VariantId, VariantDefinition> = {
  standard: {
    id: "standard",
    name: "Standard Chess",
    subtitle: "Classic FIDE Rules",
    description:
      "The traditional game of chess with standard starting position and rules.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  chess960: {
    id: "chess960",
    name: "Chess960",
    subtitle: "Fischer Random",
    description:
      "Pieces on the first rank are placed in a randomized order while preserving opposite-colored bishops and king between rooks.",
    isFullyPlayable: true,
    getInitialFen: generateChess960Fen,
  },
  kingOfTheHill: {
    id: "kingOfTheHill",
    name: "King of the Hill",
    subtitle: "Occupy the Center",
    description:
      "Standard rules, plus an additional victory condition: moving your king to one of the four center squares (d4, e4, d5, e5) wins immediately.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    checkSpecialGameOver: (game) => {
      const centerSquares = ["d4", "e4", "d5", "e5"];
      for (const sq of centerSquares) {
        // @ts-ignore
        const piece = game.get(sq);
        if (piece && piece.type === "k") {
          return {
            isOver: true,
            winner: piece.color === "w" ? "w" : "b",
            reason: `${piece.color === "w" ? "White" : "Black"} King reached the Hill! 👑`,
          };
        }
      }
      return { isOver: false };
    },
  },
  threeCheck: {
    id: "threeCheck",
    name: "Three-Check",
    subtitle: "Check 3 Times to Win",
    description:
      "Check the opponent's king three times to win the game! A fast-paced and attacking chess variant.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    checkSpecialGameOver: (_game, state) => {
      if (state.whiteChecksDelivered >= 3) {
        return {
          isOver: true,
          winner: "w",
          reason: "White checked the black king 3 times! 🎯",
        };
      }
      if (state.blackChecksDelivered >= 3) {
        return {
          isOver: true,
          winner: "b",
          reason: "Black checked the white king 3 times! 🎯",
        };
      }
      return { isOver: false };
    },
  },
  antichess: {
    id: "antichess",
    name: "Antichess",
    subtitle: "Losing Chess",
    description:
      "Lose all your pieces or get stalemated to win. Captures are mandatory whenever available.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1",
  },
  atomic: {
    id: "atomic",
    name: "Atomic",
    subtitle: "Explosive Captures",
    description:
      "Every capture causes an explosion that destroys the capturing piece, the captured piece, and all non-pawn pieces in the 8 surrounding squares.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  horde: {
    id: "horde",
    name: "Horde",
    subtitle: "36 Pawns vs Pieces",
    description:
      "White controls an army of 36 pawns, while Black controls a standard set of chess pieces.",
    isFullyPlayable: true,
    getInitialFen: () =>
      "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1",
  },
  racingKings: {
    id: "racingKings",
    name: "Racing Kings",
    subtitle: "Race to the 8th Rank",
    description:
      "Both players race their kings to the 8th rank. Checking is illegal; the first king to reach the finish line wins.",
    isFullyPlayable: true,
    getInitialFen: () => "8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1",
  },
};

export const VARIANTS_LIST: VariantDefinition[] = [
  VARIANTS.standard,
  VARIANTS.chess960,
  VARIANTS.kingOfTheHill,
  VARIANTS.threeCheck,
  VARIANTS.antichess,
  VARIANTS.atomic,
  VARIANTS.horde,
  VARIANTS.racingKings,
];
