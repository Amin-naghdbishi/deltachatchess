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
} from "../common";
import { sound } from "../audio";
import { getSettings, saveSettings, BUILTIN_THEMES, getCustomThemes, InPersonOrientationMode } from "../settings";
import { saveCompletedGame } from "../history";
import { VARIANTS } from "../variants";

let boardElId = "chess-game-board";
let boardInstance: any = null;
let orientationMode: InPersonOrientationMode = "none";
let displayedOrientation: "white" | "black" = "white";
let piecesRotated: boolean = false;
let isTransitioningTurn: boolean = false;
let turnTransitionTimeout: any = null;

export const BoardComponent: m.Component = {
  oninit: () => {
    orientationMode = state.orientationMode || getSettings().inPersonOrientation;
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
    if (state.clock && !state.clock.isUnlimited() && !state.isGameOver && !state.clock.isRunning) {
      state.clock.start(state.game.turn());
    }
  },
  oncreate: (vnode) => {
    initChessboard(vnode.dom);
    if (state.clock && !state.clock.isUnlimited() && !state.isGameOver && !state.clock.isRunning) {
      state.clock.start(state.game.turn());
    }
  },
  onremove: () => {
    if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
    isTransitioningTurn = false;
    document.body.classList.remove("pieces-rotated-180");
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
                if (state.isGameOver || confirm("Exit to menu? Match progress is preserved.")) {
                  switchView("home");
                }
              },
            },
            "←",
          ),

          m("div.bar-title-group", [
            m("span.bar-variant-text", VARIANTS[state.variantId]?.name || "Standard"),
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
          renderPlayerStrip(topColor, topName, topCaptured, isWhiteTurn === (topColor === "w")),

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
  const isClockActive = state.clock.isRunning && state.clock.activeColor === color;
  const timeStr = state.clock.getFormattedTime(color);
  const isLow = state.clock.isLowTime(color);

  return m(
    "div.player-minimal-strip",
    {
      class: isTurn && !state.isGameOver ? "turn-active" : "",
    },
    [
      m("div.player-meta-left", [
        m("span.color-dot", { class: color === "w" ? "white-dot" : "black-dot" }),
        m("span.player-label-name", normalizeName(name)),
        captured.length > 0
          ? m(
              "div.captured-mini-tray",
              captured.map((p, i) =>
                m("img.mini-captured-icon", {
                  key: i,
                  src: `/img/${color === "w" ? "b" : "w"}${p.toUpperCase()}.svg`,
                  alt: p,
                }),
              ),
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
                      if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
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
                      if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
                      isTransitioningTurn = false;
                      orientationMode = "flip";
                      state.orientationMode = "flip";
                      displayedOrientation = state.game.turn() === "w" ? "white" : "black";
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
                      if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);
                      isTransitioningTurn = false;
                      orientationMode = "rotate";
                      state.orientationMode = "rotate";
                      displayedOrientation = "white";
                      const isBlack = state.game.turn() !== "w";
                      piecesRotated = isBlack;
                      document.body.classList.toggle("pieces-rotated-180", isBlack);
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

        // 3. Sound Toggle
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

  return m("div.moves-drawer-backdrop", {
    onclick: (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("moves-drawer-backdrop")) {
        state.showMovesDrawer = false;
      }
    },
  }, [
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
  ]);
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
        blackMove ? m("span.move-san", blackMove.san) : m("span.move-san.empty"),
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
      m("div.promotion-pieces-grid", [
        pieces.map((p) =>
          m(
            "button.promotion-piece-btn",
            {
              onclick: () => {
                executeMove(promo.from, promo.to, p.type);
                state.pendingPromotion = null;
                m.redraw();
              },
            },
            [
              m("img.promo-icon", {
                src: `/img/${color}${p.type.toUpperCase()}.svg`,
                alt: p.label,
              }),
            ],
          ),
        ),
      ]),
    ]),
  ]);
}

function renderGameOverCard() {
  let title = "Game Drawn";
  if (state.winner === "w") title = `${state.whiteName} Wins`;
  else if (state.winner === "b") title = `${state.blackName} Wins`;

  return m("div.game-over-overlay", [
    m("div.game-over-card-minimal", [
      m("h3.game-over-title", title),
      m("p.game-over-reason", state.resultReason),
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
      isMyOffer ? "Draw offered. Waiting for opponent…" : "Opponent offered a draw.",
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
      pieceTheme: "/img/{piece}.svg",
      moveSpeed: getSettings().animationEnabled ? 180 : 0,
      snapbackSpeed: 80,
      snapSpeed: 80,
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
        state.pendingPromotion = { from: state.selectedSquare, to: square };
        m.redraw();
        return;
      }

      executeMove(state.selectedSquare, square);
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
    state.pendingPromotion = { from: source, to: target };
    m.redraw();
    return;
  }

  executeMove(source, target);
  clearSelection();
}

function onSnapEnd() {
  if (boardInstance) {
    boardInstance.position(state.game.fen(), false);
    updateSquareHighlights();
  }
}

function executeMove(from: string, to: string, promotion?: string) {
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

  // Update board position
  if (boardInstance) {
    boardInstance.position(state.game.fen(), getSettings().animationEnabled);
  }

  // Clear any existing turn transition timers
  if (turnTransitionTimeout) clearTimeout(turnTransitionTimeout);

  const moveAnimDelay = getSettings().animationEnabled ? 220 : 0;

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
    const specialRes = variantDef.checkSpecialGameOver(state.game, state.variantState);
    if (specialRes.isOver) {
      state.isGameOver = true;
      state.winner = specialRes.winner || null;
      state.resultReason = specialRes.reason || "Variant win condition!";
    }
  }

  // Check standard chess game over
  if (!state.isGameOver) {
    if (state.game.isCheckmate()) {
      state.isGameOver = true;
      state.winner = moveResult.color;
      state.resultReason = `Checkmate! ${moveResult.color === "w" ? state.whiteName : state.blackName} wins.`;
    } else if (state.game.isStalemate()) {
      state.isGameOver = true;
      state.winner = "draw";
      state.resultReason = "Stalemate. Game is drawn.";
    } else if (state.game.isThreefoldRepetition()) {
      state.isGameOver = true;
      state.winner = "draw";
      state.resultReason = "Draw by threefold repetition.";
    } else if (state.game.isInsufficientMaterial()) {
      state.isGameOver = true;
      state.winner = "draw";
      state.resultReason = "Draw by insufficient material.";
    } else if (state.game.isDraw()) {
      state.isGameOver = true;
      state.winner = "draw";
      state.resultReason = "Game is drawn.";
    }
  }

  // Audio effects
  if (state.isGameOver) {
    sound.playCheckmate();
    state.clock.stop();
    saveCompletedGame({
      mode: state.gameMode,
      whiteName: state.whiteName,
      blackName: state.blackName,
      winner: state.winner || "draw",
      resultReason: state.resultReason,
      variantId: state.variantId,
      variantName: variantDef?.name || "Standard Chess",
      timeControl: state.timeControlLabel,
      moves: state.moveHistory.map((m) => m.san),
      fens: state.fenHistory,
      pgn: state.game.pgn(),
    });
  } else if (state.game.inCheck()) {
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

  // Online WebXDC sync
  if (state.gameMode === "online" && window.webxdc) {
    const summary = `${normalizeName(state.game.turn() === "b" ? state.whiteName : state.blackName)} played ${moveResult.san}`;
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
          isGameOver: state.isGameOver,
          winner: state.winner,
          resultReason: state.resultReason,
        },
        info: summary,
        summary,
      },
      "",
    );
  }

  setTimeout(() => {
    updateSquareHighlights();
  }, 30);

  m.redraw();
}

function updateSquareHighlights() {
  const container = document.getElementById(boardElId);
  if (!container) return;

  container.querySelectorAll(".legal-move-dot").forEach((el) => el.remove());
  container.querySelectorAll(".legal-capture-ring").forEach((el) => el.remove());
  container.querySelectorAll(".square-selected").forEach((el) => el.classList.remove("square-selected"));
  container.querySelectorAll(".highlight-lastmove").forEach((el) => el.classList.remove("highlight-lastmove"));
  container.querySelectorAll(".highlight-check").forEach((el) => el.classList.remove("highlight-check"));

  // 1. Last Move
  if (state.lastMove) {
    const fromEl = container.querySelector(`.square-${state.lastMove.from}`);
    const toEl = container.querySelector(`.square-${state.lastMove.to}`);
    if (fromEl) fromEl.classList.add("highlight-lastmove");
    if (toEl) toEl.classList.add("highlight-lastmove");
  }

  // 2. Check
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

  // 3. Selection & Legal moves
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
        if (move.captured || move.flags.includes("c") || move.flags.includes("e")) {
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
      state.isGameOver = true;
      state.winner = "draw";
      state.resultReason = "Draw by mutual agreement.";
      state.clock.stop();
      sound.playCheckmate();
      m.redraw();
    } else {
      state.drawOfferAddr = null;
    }
  }
}

function handleAcceptDraw() {
  state.isGameOver = true;
  state.winner = "draw";
  state.resultReason = "Draw by mutual agreement.";
  state.drawOfferAddr = null;
  state.clock.stop();
  sound.playCheckmate();

  if (state.gameMode === "online" && window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "draw_accept",
          gameId: state.activeGameId,
        },
        info: "Draw agreed by both players!",
        summary: "Game ended in a draw.",
      },
      "",
    );
  }
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

  state.isGameOver = true;
  state.winner = myColor === "w" ? "b" : "w";
  state.resultReason = `${myColor === "w" ? state.whiteName : state.blackName} resigned.`;
  state.clock.stop();
  sound.playCheckmate();

  if (isOnline && window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "resign",
          gameId: state.activeGameId,
          surrenderAddr: myAddr,
        },
        info: `${normalizeName(myColor === "w" ? state.whiteName : state.blackName)} resigned.`,
        summary: `${normalizeName(myColor === "w" ? state.blackName : state.whiteName)} won by resignation!`,
      },
      "",
    );
  }
  m.redraw();
}

function handleRestart() {
  resetGame(state.variantId, 0, 0, state.timeControlLabel, state.gameMode, orientationMode);
  if (boardInstance) {
    boardInstance.position(state.game.fen(), false);
    boardInstance.orientation("white");
  }
  updateSquareHighlights();
  m.redraw();
}
