// @ts-check
import m from "mithril";
import {
  state,
  switchView,
  resetGame,
  calculateCapturedPieces,
  finalizeGame,
} from "./common";
import { applySettingsToDOM } from "./settings";
import { HomeComponent } from "./components/home";
import { PlayPersonComponent } from "./components/playPerson";
import { PlayPeopleComponent } from "./components/playPeople";
import { BoardComponent, updateSquareHighlights } from "./components/board";
import { HistoryComponent } from "./components/historyView";
import { SettingsComponent } from "./components/settingsView";
import { sound } from "./audio";
import { VARIANTS } from "./variants";

// Initialize application settings and themes on DOM load
applySettingsToDOM();

const App: m.Component = {
  view: () => {
    switch (state.currentView) {
      case "home":
        return m(HomeComponent);
      case "play-person":
        return m(PlayPersonComponent);
      case "play-online":
        return m(PlayPeopleComponent);
      case "game":
        return m(BoardComponent);
      case "history":
      case "history-review":
        return m(HistoryComponent);
      case "settings":
        return m(SettingsComponent);
      default:
        return m(HomeComponent);
    }
  },
};

// Mount Mithril application to #root
const rootEl = document.getElementById("root");
if (rootEl) {
  m.mount(rootEl, App);
}

let isInitialReplayComplete = false;

// WebXDC Real-Time Multiplayer Update Listener
if (typeof window !== "undefined" && window.webxdc) {
  window.webxdc.setUpdateListener((update) => {
    const isHistorical =
      !isInitialReplayComplete &&
      update.max_serial !== undefined &&
      update.serial < update.max_serial;

    const isLastHistorical =
      !isInitialReplayComplete &&
      update.max_serial !== undefined &&
      update.serial === update.max_serial;

    const isLive = !isHistorical && !isLastHistorical;

    const payload = update.payload;
    if (payload) {
      handleIncomingWebXdcPayload(payload, isLive);
    }

    if (isLastHistorical) {
      isInitialReplayComplete = true;
      // After all historical updates are processed:
      // If game is over, ensure clock is stopped and stay on home screen!
      if (state.isGameOver) {
        if (state.clock) state.clock.stop();
        state.currentView = "home";
      }
    } else if (
      update.max_serial === undefined ||
      update.serial > update.max_serial
    ) {
      isInitialReplayComplete = true;
    }

    m.redraw();
  });
}

function handleIncomingWebXdcPayload(payload: any, isLive: boolean = true) {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;

  // 1. Challenge Created
  if (payload.type === "challenge_create" && payload.challenge) {
    if (!state.openChallenges) state.openChallenges = [];
    const exists = state.openChallenges.some(
      (c) => c.id === payload.challenge.id,
    );
    if (!exists) {
      state.openChallenges.unshift(payload.challenge);
    }
    return;
  }

  // 2. Challenge Cancelled
  if (payload.type === "challenge_cancel" && payload.challengeId) {
    if (state.openChallenges) {
      state.openChallenges = state.openChallenges.filter(
        (c) => c.id !== payload.challengeId,
      );
    }
    return;
  }

  // 3. Game Started
  if (
    payload.type === "game_start" ||
    (payload.whiteAddr && payload.blackAddr && !payload.type)
  ) {
    // Remove challenge from open list if matched
    if (payload.challengeId && state.openChallenges) {
      state.openChallenges = state.openChallenges.filter(
        (c) => c.id !== payload.challengeId,
      );
    }

    state.activeGameId = payload.gameId || "legacy_game";
    state.whiteAddr = payload.whiteAddr;
    state.whiteName = payload.whiteName || "White";
    state.blackAddr = payload.blackAddr;
    state.blackName = payload.blackName || "Black";
    state.variantId = payload.variantId || "standard";

    resetGame(
      state.variantId,
      payload.timeControlSeconds || 0,
      payload.timeControlIncrement || 0,
      payload.timeControlLabel || "No Clock",
      "online",
    );

    if (payload.initialFen) {
      try {
        state.game.load(payload.initialFen);
        state.initialFen = payload.initialFen;
        state.fenHistory = [payload.initialFen];
      } catch (e) {}
    }

    // Start clock for white
    if ((payload.timeControlSeconds || 0) > 0) {
      state.clock.start("w");
    }

    // If I'm one of the players and this is a live game start, jump to game view!
    if (isLive && (myAddr === state.whiteAddr || myAddr === state.blackAddr)) {
      switchView("game");
      sound.playGameStart();
    }
    return;
  }

  // 4. Move Made
  if (payload.type === "move" || (payload.move && !payload.type)) {
    const moveData = payload.move;
    if (!moveData) return;

    // Check if this move was already executed locally
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    if (
      lastMove &&
      lastMove.from === moveData.from &&
      lastMove.to === moveData.to
    ) {
      return; // Already applied locally
    }

    try {
      const res = state.game.move({
        from: moveData.from,
        to: moveData.to,
        promotion: moveData.promotion || "q",
      });

      if (res) {
        state.lastMove = { from: moveData.from, to: moveData.to };
        if (res.color === "w") {
          state.lastWhiteMove = { from: moveData.from, to: moveData.to };
        } else {
          state.lastBlackMove = { from: moveData.from, to: moveData.to };
        }
        state.moveHistory.push({
          san: payload.san || res.san,
          from: moveData.from,
          to: moveData.to,
          piece: res.piece,
          color: res.color,
          captured: res.captured,
        });
        state.fenHistory.push(state.game.fen());
        calculateCapturedPieces(state.game);

        if (state.board) {
          state.board.position(state.game.fen(), isLive);
          updateSquareHighlights();
        }

        // Clock synchronization
        if (payload.whiteMs !== undefined && payload.blackMs !== undefined) {
          state.clock.whiteRemainingMs = payload.whiteMs;
          state.clock.blackRemainingMs = payload.blackMs;
        }
        state.clock.switchTurn(state.game.turn());

        // Game conclusion or move audio
        if (payload.isGameOver) {
          finalizeGame(
            payload.winner,
            payload.resultReason || "Game concluded",
            false,
          );
          if (isLive) {
            if (
              payload.resultReason &&
              payload.resultReason.toLowerCase().includes("checkmate")
            ) {
              sound.playCheckmate();
            } else {
              sound.playGameEnd();
            }
          }
        } else if (isLive) {
          if (state.game.inCheck()) {
            sound.playCheck();
          } else if (res.captured) {
            sound.playCapture();
          } else if (res.flags.includes("k") || res.flags.includes("q")) {
            sound.playCastle();
          } else {
            sound.playMove();
          }
        }
      }
    } catch (e) {
      console.error("Error executing opponent move:", e);
    }
    return;
  }

  // 5. Explicit Game Over
  if (payload.type === "game_over") {
    finalizeGame(
      payload.winner,
      payload.resultReason || "Game concluded",
      false,
    );
    if (isLive) {
      if (
        payload.resultReason &&
        payload.resultReason.toLowerCase().includes("checkmate")
      ) {
        sound.playCheckmate();
      } else {
        sound.playGameEnd();
      }
    }
    return;
  }

  // 6. Draw Offer
  if (payload.type === "draw_offer") {
    state.drawOfferAddr = payload.fromAddr;
    return;
  }

  // 7. Draw Accepted
  if (payload.type === "draw_accept") {
    finalizeGame("draw", "Draw agreed by both players! 🤝", false);
    if (isLive) sound.playGameEnd();
    return;
  }

  // 8. Draw Declined
  if (payload.type === "draw_decline") {
    state.drawOfferAddr = null;
    return;
  }

  // 9. Resignation
  if (payload.type === "resign" || payload.surrenderAddr) {
    const surrenderAddr = payload.surrenderAddr;
    const surrenderedIsWhite = surrenderAddr === state.whiteAddr;
    const winner = surrenderedIsWhite ? "b" : "w";
    const reason = `${surrenderedIsWhite ? state.whiteName : state.blackName} resigned.`;
    finalizeGame(winner, reason, false);
    if (isLive) sound.playGameEnd();
    return;
  }
}
