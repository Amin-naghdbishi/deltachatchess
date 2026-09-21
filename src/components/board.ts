// @ts-check
import m from "mithril";
import { Chess } from "chess.js";
import {
  state,
  switchView,
  normalizeName,
  calculateCapturedPieces,
  resetGame,
  handleTimeOut,
  finalizeGame,
} from "../common";
import { sound } from "../audio";
import {
  getSettings,
  saveSettings,
  BUILTIN_THEMES,
  getCustomThemes,
  InPersonOrientationMode,
  PIECE_STYLES,
  getPieceImagePath,
} from "../settings";
import { saveCompletedGame } from "../history";
import { VARIANTS } from "../variants";

let boardElId = "chess-game-board";
let boardInstance: any = null;
let orientationMode: InPersonOrientationMode = "none";
let displayedOrientation: "white" | "black" = "white";
let piecesRotated: boolean = false;
let isTransitioningTurn: boolean = false;
let turnTransitionTimeout: any = null;
let resizeListener: (() => void) | null = null;

export const BoardComponent: m.Component = {
  oninit: () => {
    orientationMode =
      state.orientationMode || getSettings().inPersonOrientation;
    const isWhiteTurn = state.game.turn() === "w";
    if (state.gameMode === "person") {
      if (orientationMode === "flip") {
        displayedOrientation = isWhiteTurn ? "white" : "black";
        piecesRotated = false;
      } else if (orientationMode === "rotate") {
        displayedOrientation = "white";
        piecesRotated = !isWhiteTurn;
      } else {
        displayedOrientation = "white";
        piecesRotated = false;
      }
    } else {
      const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
      displayedOrientation = myAddr === state.blackAddr ? "black" : "white";
      piecesRotated = false;
    }
    document.body.classList.toggle("pieces-rotated-180", piecesRotated);

    // Ensure chess clock is running for active turn if time control is active
    if (
      state.clock &&
      !state.clock.isUnlimited() &&
      !state.isGameOver &&
      !state.clock.isRunning
    ) {
      state.clock.start(state.game.turn());
    }
  },
  oncreate: (vnode) => {
    initChessboard(vnode.dom);
    if (
      state.clock &&
      !state.clock.isUnlimited() &&
      !state.isGameOver &&
      !state.clock.isRunning
    ) {
      state.clock.start(state.game.turn());
    }
    resizeListener = () => {
      if (boardInstance) {
        boardInstance.resize();
        updateSquareHighlights();
      }
    };
    window.addEventListener("resize", resizeListener);
  },
  onremove: () => {
    if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
    isTransitioningTurn = false;
    document.body.classList.remove("pieces-rotated-180");
    if (resizeListener) {
      window.removeEventListener("resize", resizeListener);
      resizeListener = null;
    }
    destroyChessboard();
  },
  view: () => {
    const isWhiteTurn = state.game.turn() === "w";
    const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
    const isOnline = state.gameMode === "online";
    const isSpectator =
      isOnline &&
      Boolean(myAddr) &&
      myAddr !== state.whiteAddr &&
      myAddr !== state.blackAddr;

    const myColor =
      !isOnline || !myAddr
        ? isWhiteTurn
          ? "w"
          : "b"
        : myAddr === state.whiteAddr
          ? "w"
          : myAddr === state.blackAddr
            ? "b"
            : null;

    // Board orientation calculation
    let currentOrientation: "white" | "black" = "white";
    if (state.gameMode === "person") {
      if (orientationMode === "flip") {
        currentOrientation = displayedOrientation;
      } else {
        currentOrientation = "white";
      }
    } else {
      currentOrientation = myColor === "b" ? "black" : "white";
    }

    // Players positioned based on board orientation
    const topColor: "w" | "b" = currentOrientation === "white" ? "b" : "w";
    const bottomColor: "w" | "b" = currentOrientation === "white" ? "w" : "b";

    const topName = topColor === "w" ? state.whiteName : state.blackName;
    const bottomName = bottomColor === "w" ? state.whiteName : state.blackName;

    const topCaptured =
      topColor === "w" ? state.capturedByWhite : state.capturedByBlack;
    const bottomCaptured =
      bottomColor === "w" ? state.capturedByWhite : state.capturedByBlack;

    return m(
      "div.game-screen",
      {
        class: piecesRotated ? "pieces-rotated-180" : "",
      },
      [
        // Minimal Top Header Bar
        m("div.game-top-bar", [
          m(
            "button.btn-bar-icon",
            {
              title: "Return to Menu",
              onclick: () => {
                if (
                  state.isGameOver ||
                  confirm("Exit to menu? Match progress is preserved.")
                ) {
                  switchView("home");
                }
              },
            },
            "←",
          ),

          m("div.bar-title-group", [
            m(
              "span.bar-variant-text",
              VARIANTS[state.variantId]?.name || "Standard",
            ),
            state.game.inCheck() && !state.isGameOver
              ? m("span.bar-check-indicator", "CHECK")
              : null,
          ]),

          m("div.bar-actions", [
            m(
              "button.btn-bar-pill",
              {
                class: state.showMovesDrawer ? "active" : "",
                onclick: () => {
                  state.showMovesDrawer = !state.showMovesDrawer;
                },
              },
              `Moves (${state.moveHistory.length})`,
            ),
            m(
              "button.btn-bar-icon",
              {
                title: "Settings & Actions",
                onclick: () => {
                  state.showSettingsModal = !state.showSettingsModal;
                },
              },
              "⚙",
            ),
          ]),
        ]),

        // In-Game Settings / Actions Modal
        state.showSettingsModal ? renderInGameSettingsModal() : null,

        // Moves Drawer (Collapsible)
        state.showMovesDrawer ? renderMovesDrawer() : null,

        // Draw Offer Banner (Minimal notification)
        state.drawOfferAddr ? renderDrawOfferBanner(myAddr) : null,

        // Hero Chess Arena (Strictly Centered & Dominant)
        m("div.chess-arena", [
          // Top Player & Clock Strip
          renderPlayerStrip(
            topColor,
            topName,
            topCaptured,
            isWhiteTurn === (topColor === "w"),
          ),

          // Chessboard Container
          m("div.board-hero-wrapper", [
            m(`div#${boardElId}.board-hero-box`, {
              onbeforeupdate: () => false,
            }),
            // Promotion Modal Overlay
            state.pendingPromotion ? renderPromotionDialog() : null,
            // Game Over Card Overlay
            state.isGameOver ? renderGameOverCard() : null,
          ]),

          // Bottom Player & Clock Strip
          renderPlayerStrip(
            bottomColor,
            bottomName,
            bottomCaptured,
            isWhiteTurn === (bottomColor === "w"),
          ),
        ]),
      ],
    );
  },
};

function renderPlayerStrip(
  color: "w" | "b",
  name: string,
  captured: string[],
  isTurn: boolean,
) {
  const isClockActive =
    state.clock.isRunning && state.clock.activeColor === color;
  const timeStr = state.clock.getFormattedTime(color);
  const isLow = state.clock.isLowTime(color);

  return m(
    "div.player-minimal-strip",
    {
      class: isTurn && !state.isGameOver ? "turn-active" : "",
    },
    [
      m("div.player-meta-left", [
        m("span.color-dot", {
          class: color === "w" ? "white-dot" : "black-dot",
        }),
        m("span.player-label-name", normalizeName(name)),
        captured.length > 0
          ? m(
              "div.captured-mini-tray",
              captured.map((p, i) => {
                const isCapturedBlack = color === "w";
                return m(
                  "span.captured-piece-badge",
                  {
                    key: i,
                    class: isCapturedBlack
                      ? "captured-black-badge"
                      : "captured-white-badge",
                    title: `${isCapturedBlack ? "Black" : "White"} ${p.toUpperCase()}`,
                  },
                  m("img.mini-captured-icon", {
                    src: getPieceImagePath(
                      `${isCapturedBlack ? "b" : "w"}${p.toUpperCase()}`,
                    ),
                    alt: p,
                  }),
                );
              }),
            )
          : null,
      ]),

      // Minimalist Digital Clock
      !state.clock.isUnlimited()
        ? m(
            "div.player-clock-minimal",
            {
              class: `${isClockActive ? "active-clock" : ""} ${isLow ? "low-time" : ""}`,
            },
            timeStr,
          )
        : null,
    ],
  );
}

function renderInGameSettingsModal() {
  const settings = getSettings();
  const allThemes = [...Object.values(BUILTIN_THEMES), ...getCustomThemes()];

  return m("div.minimal-modal-overlay", [
    m("div.minimal-modal-card", [
      m("div.modal-card-top", [
        m("h3.minimal-modal-title", "Game Settings"),
        m(
          "button.btn-close-minimal",
          {
            onclick: () => {
              state.showSettingsModal = false;
            },
          },
          "✕",
        ),
      ]),

      m("div.in-game-settings-stack", [
        // 1. Board Orientation (Crucial for In-Person)
        state.gameMode === "person"
          ? m("div.setting-row-group", [
              m("span.setting-group-label", "Board Orientation"),
              m("div.segmented-row", [
                m(
                  "button.seg-btn",
                  {
                    class: orientationMode === "none" ? "active" : "",
                    onclick: () => {
                      if (turnTransitionTimeout)
                        clearTimeout(turnTransitionTimeout);
                      isTransitioningTurn = false;
                      orientationMode = "none";
                      state.orientationMode = "none";
                      displayedOrientation = "white";
                      piecesRotated = false;
                      document.body.classList.remove("pieces-rotated-180");
                      if (boardInstance) boardInstance.orientation("white");
                      setTimeout(() => updateSquareHighlights(), 50);
                    },
                  },
                  "No Flip",
                ),
                m(
                  "button.seg-btn",
                  {
                    class: orientationMode === "flip" ? "active" : "",
                    onclick: () => {
                      if (turnTransitionTimeout)
                        clearTimeout(turnTransitionTimeout);
                      isTransitioningTurn = false;
                      orientationMode = "flip";
                      state.orientationMode = "flip";
                      displayedOrientation =
                        state.game.turn() === "w" ? "white" : "black";
                      piecesRotated = false;
                      document.body.classList.remove("pieces-rotated-180");
                      if (boardInstance) {
                        boardInstance.orientation(displayedOrientation);
                      }
                      setTimeout(() => updateSquareHighlights(), 50);
                    },
                  },
                  "Flip Board",
                ),
                m(
                  "button.seg-btn",
                  {
                    class: orientationMode === "rotate" ? "active" : "",
                    onclick: () => {
                      if (turnTransitionTimeout)
                        clearTimeout(turnTransitionTimeout);
                      isTransitioningTurn = false;
                      orientationMode = "rotate";
                      state.orientationMode = "rotate";
                      displayedOrientation = "white";
                      const isBlack = state.game.turn() !== "w";
                      piecesRotated = isBlack;
                      document.body.classList.toggle(
                        "pieces-rotated-180",
                        isBlack,
                      );
                      if (boardInstance) boardInstance.orientation("white");
                      setTimeout(() => updateSquareHighlights(), 50);
                    },
                  },
                  "Rotate Screen",
                ),
              ]),
            ])
          : null,

        // 2. Quick Theme Selector
        m("div.setting-row-group", [
          m("span.setting-group-label", "Board Theme"),
          m(
            "div.theme-quick-chips",
            allThemes.map((t) =>
              m(
                "button.quick-theme-chip",
                {
                  class: settings.activeThemeId === t.id ? "active" : "",
                  onclick: () => {
                    saveSettings({ activeThemeId: t.id });
                    sound.playMove();
                  },
                },
                t.name,
              ),
            ),
          ),
        ]),

        // 3. Piece Style Selector
        m("div.setting-row-group", [
          m("span.setting-group-label", "Piece Style"),
          m(
            "div.theme-quick-chips",
            Object.values(PIECE_STYLES).map((style) =>
              m(
                "button.quick-theme-chip",
                {
                  class: settings.pieceStyle === style.id ? "active" : "",
                  onclick: () => {
                    saveSettings({ pieceStyle: style.id });
                    document
                      .querySelectorAll(".board-hero-wrapper img.piece-417db")
                      .forEach((img) => {
                        const piece = img.getAttribute("data-piece");
                        if (piece) {
                          (img as HTMLImageElement).src = getPieceImagePath(
                            piece,
                            style.id,
                          );
                        }
                      });
                    sound.playMove();
                  },
                },
                style.name,
              ),
            ),
          ),
        ]),

        // 4. Sound Toggle
        m("div.setting-row-group", [
          m("div.setting-line-item", [
            m("span.setting-title-text", "Sound Effects"),
            m("input.toggle-switch", {
              type: "checkbox",
              checked: settings.soundEnabled,
              onchange: (e: any) => {
                saveSettings({ soundEnabled: e.target.checked });
                if (e.target.checked) sound.playMove();
              },
            }),
          ]),
        ]),

        // 4. In-Game Actions
        m("div.setting-actions-row", [
          state.gameMode === "person" && !state.isGameOver
            ? m(
                "button.btn-minimal-secondary",
                {
                  disabled: state.moveHistory.length === 0,
                  onclick: () => {
                    handleUndo();
                    state.showSettingsModal = false;
                  },
                },
                "↩ Undo Move",
              )
            : null,

          !state.isGameOver
            ? m(
                "button.btn-minimal-secondary",
                {
                  onclick: () => {
                    handleOfferDraw();
                    state.showSettingsModal = false;
                  },
                },
                "Offer Draw",
              )
            : null,

          !state.isGameOver
            ? m(
                "button.btn-minimal-danger",
                {
                  onclick: () => {
                    handleResign();
                    state.showSettingsModal = false;
                  },
                },
                "Resign",
              )
            : null,
        ]),

        // Close button
        m(
          "button.btn-minimal-primary.w-full",
          {
            onclick: () => {
              state.showSettingsModal = false;
            },
          },
          "Done",
        ),
      ]),
    ]),
  ]);
}

function renderMovesDrawer() {
  const moves = state.moveHistory;

  return m(
    "div.moves-drawer-backdrop",
    {
      onclick: (e: MouseEvent) => {
        if (
          (e.target as HTMLElement).classList.contains("moves-drawer-backdrop")
        ) {
          state.showMovesDrawer = false;
        }
      },
    },
    [
      m("div.moves-drawer-card", [
        m("div.drawer-header", [
          m("h4.drawer-title", `Moves (${moves.length} ply)`),
          m(
            "button.btn-close-minimal",
            {
              onclick: () => {
                state.showMovesDrawer = false;
              },
            },
            "✕",
          ),
        ]),

        m(
          "div.moves-table-scroller",
          moves.length === 0
            ? m("div.empty-moves-text", "No moves played yet.")
            : renderMovesTable(moves),
        ),

        m("div.drawer-footer", [
          m(
            "button.btn-minimal-secondary.w-full",
            {
              disabled: moves.length === 0,
              onclick: () => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(state.game.pgn());
                  alert("PGN copied to clipboard!");
                }
              },
            },
            "Copy PGN",
          ),
        ]),
      ]),
    ],
  );
}

function renderMovesTable(moves: any[]) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];

    rows.push(
      m("div.move-row-item", { key: moveNum }, [
        m("span.move-num", `${moveNum}.`),
        m("span.move-san", whiteMove.san),
        blackMove
          ? m("span.move-san", blackMove.san)
          : m("span.move-san.empty"),
      ]),
    );
  }
  return rows;
}

function renderPromotionDialog() {
  const promo = state.pendingPromotion;
  if (!promo) return null;

  const color = state.game.turn();
  const pieces = [
    { type: "q", label: "Queen" },
    { type: "r", label: "Rook" },
    { type: "b", label: "Bishop" },
    { type: "n", label: "Knight" },
  ];

  return m("div.promotion-modal-backdrop", [
    m("div.promotion-dialog", [
      m("h4.promotion-heading", "Promote Pawn"),
      m(
        "div.promotion-pieces-grid",
        pieces.map((p) =>
          m(
            "button.promotion-piece-btn",
            {
              class: color === "w" ? "promo-white-piece" : "promo-black-piece",
              title: p.label,
              onclick: () => {
                const animate = !promo.viaDrag;
                executeMove(promo.from, promo.to, p.type, animate);
                state.pendingPromotion = null;
                m.redraw();
              },
            },
            [
              m("img.promo-icon", {
                src: getPieceImagePath(`${color}${p.type.toUpperCase()}`),
                alt: p.label,
              }),
            ],
          ),
        ),
      ),
    ]),
  ]);
}

function renderGameOverCard() {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
  const isOnline = state.gameMode === "online";
  const myColor =
    !isOnline || !myAddr
      ? null
      : myAddr === state.whiteAddr
        ? "w"
        : myAddr === state.blackAddr
          ? "b"
          : null;

  let mainTitle = "Game Over";
  if (state.winner === "draw") {
    mainTitle = "Game Drawn";
  } else if (isOnline && myColor) {
    if (state.winner === myColor) {
      mainTitle = "Victory! 🏆";
    } else {
      mainTitle = "Defeat";
    }
  } else {
    mainTitle =
      state.winner === "w"
        ? `${state.whiteName} Wins`
        : state.winner === "b"
          ? `${state.blackName} Wins`
          : "Game Drawn";
  }

  // Outcome status for White
  const whiteStatus =
    state.winner === "draw"
      ? { text: "Draw (½)", class: "result-draw" }
      : state.winner === "w"
        ? { text: "Winner 🏆 (1.0)", class: "result-win" }
        : { text: "Defeated ✕ (0.0)", class: "result-loss" };

  // Outcome status for Black
  const blackStatus =
    state.winner === "draw"
      ? { text: "Draw (½)", class: "result-draw" }
      : state.winner === "b"
        ? { text: "Winner 🏆 (1.0)", class: "result-win" }
        : { text: "Defeated ✕ (0.0)", class: "result-loss" };

  return m("div.game-over-overlay", [
    m("div.game-over-card-minimal", [
      m("h3.game-over-title", mainTitle),
      m("p.game-over-reason", state.resultReason),

      // Outcome breakdown for BOTH players
      m("div.game-over-players-summary", [
        // White Player Result
        m("div.game-over-player-row", [
          m("div.game-over-player-cell", [
            m("span.color-dot.white-dot"),
            m("span.game-over-player-name", normalizeName(state.whiteName)),
          ]),
          m(
            "span.game-over-badge",
            { class: whiteStatus.class },
            whiteStatus.text,
          ),
        ]),

        // Black Player Result
        m("div.game-over-player-row", [
          m("div.game-over-player-cell", [
            m("span.color-dot.black-dot"),
            m("span.game-over-player-name", normalizeName(state.blackName)),
          ]),
          m(
            "span.game-over-badge",
            { class: blackStatus.class },
            blackStatus.text,
          ),
        ]),
      ]),

      m("div.game-over-buttons", [
        m(
          "button.btn-minimal-primary",
          {
            onclick: () => handleRestart(),
          },
          "Play Again",
        ),
        m(
          "button.btn-minimal-secondary",
          {
            onclick: () => switchView("home"),
          },
          "Main Menu",
        ),
      ]),
    ]),
  ]);
}

function renderDrawOfferBanner(myAddr: string | null) {
  const isMyOffer = state.drawOfferAddr === myAddr;

  return m("div.draw-offer-minimal-strip", [
    m(
      "span.draw-offer-msg",
      isMyOffer
        ? "Draw offered. Waiting for opponent…"
        : "Opponent offered a draw.",
    ),
    !isMyOffer
      ? m("div.draw-offer-actions", [
          m(
            "button.btn-pill-small.btn-accept",
            {
              onclick: () => handleAcceptDraw(),
            },
            "Accept",
          ),
          m(
            "button.btn-pill-small.btn-decline",
            {
              onclick: () => handleDeclineDraw(),
            },
            "Decline",
          ),
        ])
      : null,
  ]);
}

// ================= BOARD ENGINE & INTERACTION =================
function initChessboard(dom: Element) {
  const container = dom.querySelector(`#${boardElId}`);
  if (!container) return;

  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
  const isOnline = state.gameMode === "online";
  const myColor =
    !isOnline || !myAddr
      ? null
      : myAddr === state.whiteAddr
        ? "w"
        : myAddr === state.blackAddr
          ? "b"
          : null;

  let orientation: "white" | "black" = "white";
  if (state.gameMode === "person") {
    if (orientationMode === "flip") {
      orientation = displayedOrientation;
    } else {
      orientation = "white";
    }
  } else {
    orientation = myColor === "b" ? "black" : "white";
  }

  // @ts-ignore
  if (typeof Chessboard !== "undefined") {
    // @ts-ignore
    boardInstance = Chessboard(boardElId, {
      position: state.game.fen(),
      orientation,
      draggable: true,
      pieceTheme: (piece: string) => getPieceImagePath(piece),
      moveSpeed: getSettings().animationEnabled ? 180 : 0,
      snapbackSpeed: 80,
      snapSpeed: 1,
      onDragStart,
      onDrop,
      onSnapEnd,
    });
    state.board = boardInstance;

    attachSquareClickHandlers(container);

    setTimeout(() => {
      updateSquareHighlights();
    }, 50);
  }
}

function destroyChessboard() {
  if (boardInstance) {
    boardInstance.destroy();
    boardInstance = null;
    state.board = null;
  }
}

function attachSquareClickHandlers(container: Element) {
  container.addEventListener("click", (e: any) => {
    const squareEl = e.target.closest(".square-55d63");
    if (!squareEl) {
      clearSelection();
      return;
    }

    const match = squareEl.className.match(/square-([a-h][1-8])/);
    if (!match) return;
    const clickedSquare = match[1];

    handleSquareClick(clickedSquare);
  });
}

function handleSquareClick(square: string) {
  if (state.isGameOver || isTransitioningTurn) return;

  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
  const isOnline = state.gameMode === "online";
  const currentTurn = state.game.turn();

  if (isOnline && myAddr) {
    if (myAddr !== state.whiteAddr && myAddr !== state.blackAddr) return;
    if (currentTurn === "w" && myAddr !== state.whiteAddr) return;
    if (currentTurn === "b" && myAddr !== state.blackAddr) return;
  }

  if (state.selectedSquare) {
    const legalMoves = state.game.moves({
      square: state.selectedSquare as any,
      verbose: true,
    }) as any[];
    const matchingMove = legalMoves.find((m: any) => m.to === square);

    if (matchingMove) {
      if (matchingMove.flags && matchingMove.flags.includes("p")) {
        state.pendingPromotion = {
          from: state.selectedSquare,
          to: square,
          viaDrag: false,
        };
        m.redraw();
        return;
      }

      executeMove(state.selectedSquare, square, undefined, true);
      clearSelection();
      return;
    }

    const pieceOnSquare = state.game.get(square as any);
    if (pieceOnSquare && pieceOnSquare.color === currentTurn) {
      state.selectedSquare = square;
      updateSquareHighlights();
      m.redraw();
      return;
    }

    clearSelection();
    return;
  }

  const piece = state.game.get(square as any);
  if (piece && piece.color === currentTurn) {
    state.selectedSquare = square;
    updateSquareHighlights();
    m.redraw();
  }
}

function clearSelection() {
  state.selectedSquare = null;
  updateSquareHighlights();
  m.redraw();
}

function onDragStart(source: string, piece: string) {
  if (state.isGameOver || isTransitioningTurn) return false;

  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
  const isOnline = state.gameMode === "online";
  const currentTurn = state.game.turn();

  if (isOnline && myAddr) {
    if (myAddr !== state.whiteAddr && myAddr !== state.blackAddr) return false;
    if (currentTurn === "w" && myAddr !== state.whiteAddr) return false;
    if (currentTurn === "b" && myAddr !== state.blackAddr) return false;
  }

  if (
    (currentTurn === "w" && piece.search(/^b/) !== -1) ||
    (currentTurn === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }

  state.selectedSquare = source;
  updateSquareHighlights();
  return true;
}

function onDrop(source: string, target: string) {
  if (source === target) return;

  const legalMoves = state.game.moves({
    square: source as any,
    verbose: true,
  }) as any[];
  const matchingMove = legalMoves.find((m: any) => m.to === target);

  if (!matchingMove) {
    clearSelection();
    return "snapback";
  }

  if (matchingMove.flags && matchingMove.flags.includes("p")) {
    state.pendingPromotion = { from: source, to: target, viaDrag: true };
    m.redraw();
    return;
  }

  executeMove(source, target, undefined, false);
  clearSelection();
}

function onSnapEnd() {
  if (boardInstance) {
    boardInstance.position(state.game.fen(), false);
    updateSquareHighlights();
  }
}

function executeMove(
  from: string,
  to: string,
  promotion?: string,
  animate: boolean = false,
) {
  let moveResult: any = null;
  try {
    moveResult = state.game.move({
      from,
      to,
      promotion: promotion || "q",
    });
  } catch (e) {
    console.error("Move execution error:", e);
    return;
  }

  if (!moveResult) return;

  // Clock turn switch immediately (calculates exact wall-clock time spent + increment)
  state.clock.switchTurn(state.game.turn());

  state.lastMove = { from, to };
  if (moveResult.color === "w") {
    state.lastWhiteMove = { from, to };
  } else {
    state.lastBlackMove = { from, to };
  }
  state.selectedSquare = null;

  state.moveHistory.push({
    san: moveResult.san,
    from,
    to,
    piece: moveResult.piece,
    color: moveResult.color,
    captured: moveResult.captured,
  });
  state.fenHistory.push(state.game.fen());

  // Variant check counts
  if (state.game.inCheck()) {
    if (moveResult.color === "w") {
      state.variantState.whiteChecksDelivered++;
    } else {
      state.variantState.blackChecksDelivered++;
    }
  }

  calculateCapturedPieces(state.game);

  // Update board position: only animate if explicitly triggered via dot selection and animation is enabled
  const shouldAnimate = animate && getSettings().animationEnabled;
  if (boardInstance) {
    boardInstance.position(state.game.fen(), shouldAnimate);
  }

  // Clear any existing turn transition timers
  if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);

  const moveAnimDelay = shouldAnimate ? 200 : 0;

  if (state.gameMode === "person" && orientationMode === "flip") {
    isTransitioningTurn = true;
    // Wait for piece move animation to completely finish, then flip board for next player
    turnTransitionTimeout = setTimeout(() => {
      isTransitioningTurn = false;
      const nextTurn = state.game.turn();
      displayedOrientation = nextTurn === "w" ? "white" : "black";
      if (boardInstance) {
        boardInstance.orientation(displayedOrientation);
      }
      updateSquareHighlights();
      m.redraw();
    }, moveAnimDelay);
  } else if (state.gameMode === "person" && orientationMode === "rotate") {
    const nextIsRotated = state.game.turn() !== "w";
    isTransitioningTurn = true;

    // Swift piece rotation right after piece move lands
    turnTransitionTimeout = setTimeout(() => {
      piecesRotated = nextIsRotated;
      document.body.classList.toggle("pieces-rotated-180", piecesRotated);
      isTransitioningTurn = false;
      m.redraw();
    }, moveAnimDelay);
  }

  // Check variant special win conditions
  const variantDef = VARIANTS[state.variantId];
  if (variantDef && variantDef.checkSpecialGameOver) {
    const specialRes = variantDef.checkSpecialGameOver(
      state.game,
      state.variantState,
    );
    if (specialRes.isOver) {
      finalizeGame(
        specialRes.winner || "draw",
        specialRes.reason || "Variant win condition!",
        true,
      );
      sound.playCheckmate();
    }
  }

  // Check standard chess game over
  if (!state.isGameOver) {
    if (state.game.isCheckmate()) {
      const winner = moveResult.color;
      const reason = `Checkmate! ${moveResult.color === "w" ? state.whiteName : state.blackName} wins.`;
      finalizeGame(winner, reason, true);
      sound.playCheckmate();
    } else if (state.game.isStalemate()) {
      finalizeGame("draw", "Stalemate. Game is drawn.", true);
      sound.playGameEnd();
    } else if (state.game.isThreefoldRepetition()) {
      finalizeGame("draw", "Draw by threefold repetition.", true);
      sound.playGameEnd();
    } else if (state.game.isInsufficientMaterial()) {
      finalizeGame("draw", "Draw by insufficient material.", true);
      sound.playGameEnd();
    } else if (state.game.isDraw()) {
      finalizeGame("draw", "Game is drawn.", true);
      sound.playGameEnd();
    }
  }

  // Audio effects for ongoing game
  if (!state.isGameOver) {
    if (state.game.inCheck()) {
      sound.playCheck();
    } else if (moveResult.captured) {
      sound.playCapture();
    } else if (moveResult.flags.includes("k") || moveResult.flags.includes("q")) {
      sound.playCastle();
    } else if (promotion) {
      sound.playPromotion();
    } else {
      sound.playMove();
    }
  }

  // Online WebXDC sync:
  // Normal chess moves are sent SILENTLY without info/summary to keep Delta Chat clean!
  // (Game-ending moves are broadcast with summary by finalizeGame)
  if (!state.isGameOver && state.gameMode === "online" && window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "move",
          gameId: state.activeGameId,
          move: { from, to, promotion: promotion || "q" },
          san: moveResult.san,
          fen: state.game.fen(),
          whiteMs: state.clock.whiteRemainingMs,
          blackMs: state.clock.blackRemainingMs,
          isGameOver: false,
        },
      },
      "",
    );
  }

  setTimeout(() => {
    updateSquareHighlights();
  }, 30);

  m.redraw();
}

export function updateSquareHighlights() {
  const container = document.getElementById(boardElId);
  if (!container) return;

  container.querySelectorAll(".legal-move-dot").forEach((el) => el.remove());
  container
    .querySelectorAll(".legal-capture-ring")
    .forEach((el) => el.remove());
  container
    .querySelectorAll(".square-selected")
    .forEach((el) => el.classList.remove("square-selected"));
  container
    .querySelectorAll(".highlight-lastmove-self")
    .forEach((el) => el.classList.remove("highlight-lastmove-self"));
  container
    .querySelectorAll(".highlight-lastmove-opp")
    .forEach((el) => el.classList.remove("highlight-lastmove-opp"));
  container
    .querySelectorAll(".highlight-lastmove")
    .forEach((el) => el.classList.remove("highlight-lastmove"));
  container
    .querySelectorAll(".highlight-lastmove-from")
    .forEach((el) => el.classList.remove("highlight-lastmove-from"));
  container
    .querySelectorAll(".highlight-lastmove-to")
    .forEach((el) => el.classList.remove("highlight-lastmove-to"));
  container
    .querySelectorAll(".highlight-check")
    .forEach((el) => el.classList.remove("highlight-check"));

  // Highlight only the single most recent move (Chess.com style)
  // Regardless of whether White or Black moved, only the latest move is highlighted.
  // The 'from' square has a softer tone, and the 'to' square has a slightly deeper tone.
  if (state.lastMove) {
    const fromEl = container.querySelector(`.square-${state.lastMove.from}`);
    const toEl = container.querySelector(`.square-${state.lastMove.to}`);
    if (fromEl) fromEl.classList.add("highlight-lastmove-from");
    if (toEl) toEl.classList.add("highlight-lastmove-to");
  }

  // 3. Check
  if (state.game.inCheck()) {
    const turn = state.game.turn();
    const board = state.game.board();
    let kingSquare: string | null = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq && sq.type === "k" && sq.color === turn) {
          kingSquare = `${String.fromCharCode(97 + c)}${8 - r}`;
          break;
        }
      }
      if (kingSquare) break;
    }
    if (kingSquare) {
      const kingEl = container.querySelector(`.square-${kingSquare}`);
      if (kingEl) kingEl.classList.add("highlight-check");
    }
  }

  // 4. Selection & Legal moves
  if (state.selectedSquare) {
    const selEl = container.querySelector(`.square-${state.selectedSquare}`);
    if (selEl) selEl.classList.add("square-selected");

    const legalMoves = state.game.moves({
      square: state.selectedSquare as any,
      verbose: true,
    }) as any[];
    legalMoves.forEach((move: any) => {
      const targetEl = container.querySelector(`.square-${move.to}`);
      if (targetEl) {
        if (
          move.captured ||
          move.flags.includes("c") ||
          move.flags.includes("e")
        ) {
          const ring = document.createElement("div");
          ring.className = "legal-capture-ring";
          targetEl.appendChild(ring);
        } else {
          const dot = document.createElement("div");
          dot.className = "legal-move-dot";
          targetEl.appendChild(dot);
        }
      }
    });
  }
}

function handleUndo() {
  if (state.gameMode !== "person" || state.moveHistory.length === 0) return;

  if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
  isTransitioningTurn = false;

  state.game.undo();
  state.moveHistory.pop();
  state.fenHistory.pop();

  const prevMove = state.moveHistory[state.moveHistory.length - 1];
  state.lastMove = prevMove ? { from: prevMove.from, to: prevMove.to } : null;

  // Recalculate last moves for both players from remaining history
  state.lastWhiteMove = null;
  state.lastBlackMove = null;
  for (let i = state.moveHistory.length - 1; i >= 0; i--) {
    const m = state.moveHistory[i];
    if (m.color === "w" && !state.lastWhiteMove) {
      state.lastWhiteMove = { from: m.from, to: m.to };
    }
    if (m.color === "b" && !state.lastBlackMove) {
      state.lastBlackMove = { from: m.from, to: m.to };
    }
    if (state.lastWhiteMove && state.lastBlackMove) break;
  }

  state.selectedSquare = null;
  state.isGameOver = false;
  state.winner = null;
  state.resultReason = "";

  calculateCapturedPieces(state.game);
  if (boardInstance) {
    boardInstance.position(state.game.fen(), false);
    if (orientationMode === "flip") {
      displayedOrientation = state.game.turn() === "w" ? "white" : "black";
      boardInstance.orientation(displayedOrientation);
    } else if (orientationMode === "rotate") {
      piecesRotated = state.game.turn() !== "w";
      document.body.classList.toggle("pieces-rotated-180", piecesRotated);
    }
  }
  sound.playMove();
  setTimeout(() => updateSquareHighlights(), 40);
  m.redraw();
}

function handleOfferDraw() {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : "person";
  state.drawOfferAddr = myAddr;

  if (state.gameMode === "online" && window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "draw_offer",
          gameId: state.activeGameId,
          fromAddr: myAddr,
        },
        info: `${normalizeName(window.webxdc.selfName)} offered a draw`,
      },
      "",
    );
  } else {
    if (confirm("Opponent agrees to a draw?")) {
      finalizeGame("draw", "Draw by mutual agreement.", false);
      sound.playGameEnd();
      m.redraw();
    } else {
      state.drawOfferAddr = null;
    }
  }
}

function handleAcceptDraw() {
  finalizeGame("draw", "Draw by mutual agreement.", true);
  sound.playGameEnd();
  m.redraw();
}

function handleDeclineDraw() {
  state.drawOfferAddr = null;
  if (state.gameMode === "online" && window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "draw_decline",
          gameId: state.activeGameId,
        },
        info: "Draw offer declined.",
      },
      "",
    );
  }
  m.redraw();
}

function handleResign() {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;
  const isOnline = state.gameMode === "online";
  const myColor =
    !isOnline || !myAddr
      ? state.game.turn()
      : myAddr === state.whiteAddr
        ? "w"
        : "b";

  if (!confirm("Are you sure you want to resign this game?")) return;

  const winner = myColor === "w" ? "b" : "w";
  const reason = `${myColor === "w" ? state.whiteName : state.blackName} resigned.`;
  finalizeGame(winner, reason, true);
  sound.playGameEnd();
  m.redraw();
}

function handleRestart() {
  resetGame(
    state.variantId,
    0,
    0,
    state.timeControlLabel,
    state.gameMode,
    orientationMode,
  );
  if (boardInstance) {
    boardInstance.position(state.game.fen(), false);
    boardInstance.orientation("white");
  }
  updateSquareHighlights();
  m.redraw();
}
