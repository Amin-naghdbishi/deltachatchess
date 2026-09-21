// @ts-check
import m from "mithril";
import { state, switchView, resetGame, calculateCapturedPieces } from "./common";
import { applySettingsToDOM } from "./settings";
import { HomeComponent } from "./components/home";
import { PlayPersonComponent } from "./components/playPerson";
import { PlayPeopleComponent } from "./components/playPeople";
import { BoardComponent } from "./components/board";
import { HistoryComponent } from "./components/historyView";
import { SettingsComponent } from "./components/settingsView";
import { sound } from "./audio";
import { saveCompletedGame } from "./history";
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

// WebXDC Real-Time Multiplayer Update Listener
if (typeof window !== "undefined" && window.webxdc) {
  window.webxdc.setUpdateListener((update) => {
    const payload = update.payload;
    if (!payload) return;

    handleIncomingWebXdcPayload(payload);
    m.redraw();
  });
}

function handleIncomingWebXdcPayload(payload: any) {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : null;

  // 1. Challenge Created
  if (payload.type === "challenge_create" && payload.challenge) {
    if (!state.openChallenges) state.openChallenges = [];
    const exists = state.openChallenges.some((c) => c.id === payload.challenge.id);
    if (!exists) {
      state.openChallenges.unshift(payload.challenge);
    }
    return;
  }

  // 2. Challenge Cancelled
  if (payload.type === "challenge_cancel" && payload.challengeId) {
    if (state.openChallenges) {
      state.openChallenges = state.openChallenges.filter((c) => c.id !== payload.challengeId);
    }
    return;
  }

  // 3. Game Started
  if (payload.type === "game_start" || (payload.whiteAddr && payload.blackAddr && !payload.type)) {
    // Remove challenge from open list if matched
    if (payload.challengeId && state.openChallenges) {
      state.openChallenges = state.openChallenges.filter((c) => c.id !== payload.challengeId);
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

    // If I'm one of the players, jump to game view!
    if (myAddr === state.whiteAddr || myAddr === state.blackAddr) {
      switchView("game");
    }
    return;
  }

  // 4. Move Made
  if (payload.type === "move" || (payload.move && !payload.type)) {
    const moveData = payload.move;
    if (!moveData) return;

    // Check if this move was already executed locally
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    if (lastMove && lastMove.from === moveData.from && lastMove.to === moveData.to) {
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
          state.board.position(state.game.fen(), true);
        }

        // Clock synchronization
        if (payload.whiteMs !== undefined && payload.blackMs !== undefined) {
          state.clock.whiteRemainingMs = payload.whiteMs;
          state.clock.blackRemainingMs = payload.blackMs;
        }
        state.clock.switchTurn(state.game.turn());

        // Sound
        if (payload.isGameOver) {
          sound.playCheckmate();
          state.isGameOver = true;
          state.winner = payload.winner;
          state.resultReason = payload.resultReason || "Game concluded";
          state.clock.stop();

          saveCompletedGame({
            mode: "online",
            whiteName: state.whiteName,
            blackName: state.blackName,
            winner: state.winner || "draw",
            resultReason: state.resultReason,
            variantId: state.variantId,
            variantName: VARIANTS[state.variantId]?.name || "Standard",
            timeControl: state.timeControlLabel,
            moves: state.moveHistory.map((m) => m.san),
            fens: state.fenHistory,
            pgn: state.game.pgn(),
          });
        } else if (state.game.inCheck()) {
          sound.playCheck();
        } else if (res.captured) {
          sound.playCapture();
        } else if (res.flags.includes("k") || res.flags.includes("q")) {
          sound.playCastle();
        } else {
          sound.playMove();
        }
      }
    } catch (e) {
      console.error("Error executing opponent move:", e);
    }
    return;
  }

  // 5. Draw Offer
  if (payload.type === "draw_offer") {
    state.drawOfferAddr = payload.fromAddr;
    return;
  }

  // 6. Draw Accepted
  if (payload.type === "draw_accept") {
    state.isGameOver = true;
    state.winner = "draw";
    state.resultReason = "Draw agreed by both players! 🤝";
    state.drawOfferAddr = null;
    state.clock.stop();
    sound.playCheckmate();
    return;
  }

  // 7. Draw Declined
  if (payload.type === "draw_decline") {
    state.drawOfferAddr = null;
    return;
  }

  // 8. Resignation
  if (payload.type === "resign" || payload.surrenderAddr) {
    const surrenderAddr = payload.surrenderAddr;
    const surrenderedIsWhite = surrenderAddr === state.whiteAddr;
    state.isGameOver = true;
    state.winner = surrenderedIsWhite ? "b" : "w";
    state.resultReason = `${surrenderedIsWhite ? state.whiteName : state.blackName} resigned.`;
    state.clock.stop();
    sound.playCheckmate();
    return;
  }
}
