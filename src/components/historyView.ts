// @ts-check
import m from "mithril";
import { state, switchView } from "../common";
import {
  loadAllHistory,
  deleteGameById,
  deleteGamesByIds,
  clearAllGameHistory,
  GameHistoryEntry,
} from "../history";
import { getSettings, saveSettings, getPieceImagePath } from "../settings";
import { sound } from "../audio";

let selectedGameIds: Set<string> = new Set();
let isSelectionMode = false;
let showRetentionModal = false;
let autoPlayInterval: number | null = null;
let reviewBoardInstance: any = null;

export const HistoryComponent: m.Component = {
  oninit: () => {
    selectedGameIds.clear();
    isSelectionMode = false;
  },
  view: () => {
    if (state.currentView === "history-review" && state.reviewGameEntry) {
      return m(HistoryReviewComponent);
    }

    const history = loadAllHistory();
    const settings = getSettings();

    return m("div.history-screen", [
      // Top Nav Bar
      m("div.history-header", [
        m(
          "button.btn-back",
          {
            onclick: () => switchView("home"),
          },
          "← Back to Menu",
        ),
        m("h2.history-title", "Game History"),
        m("div.history-header-actions", [
          m(
            "button.btn-icon-action",
            {
              title: "History Storage Settings",
              onclick: () => {
                showRetentionModal = true;
              },
            },
            "⚙️ Storage",
          ),
          history.length > 0
            ? m(
                "button.btn-select-toggle",
                {
                  class: isSelectionMode ? "active" : "",
                  onclick: () => {
                    isSelectionMode = !isSelectionMode;
                    selectedGameIds.clear();
                  },
                },
                isSelectionMode ? "Cancel" : "Select",
              )
            : null,
        ]),
      ]),

      // Selection Action Bar (when selecting multiple games)
      isSelectionMode && history.length > 0
        ? m("div.batch-action-bar", [
            m("span.batch-count", `${selectedGameIds.size} selected`),
            m("div.batch-btns", [
              m(
                "button.btn-batch-all",
                {
                  onclick: () => {
                    if (selectedGameIds.size === history.length) {
                      selectedGameIds.clear();
                    } else {
                      selectedGameIds = new Set(history.map((g) => g.id));
                    }
                  },
                },
                selectedGameIds.size === history.length
                  ? "Deselect All"
                  : "Select All",
              ),
              m(
                "button.btn-batch-delete",
                {
                  disabled: selectedGameIds.size === 0,
                  onclick: () => {
                    if (
                      confirm(`Delete ${selectedGameIds.size} selected games?`)
                    ) {
                      deleteGamesByIds(Array.from(selectedGameIds));
                      selectedGameIds.clear();
                      isSelectionMode = false;
                      m.redraw();
                    }
                  },
                },
                `Delete (${selectedGameIds.size})`,
              ),
            ]),
          ])
        : null,

      // History List Body
      m("div.history-body", [
        history.length === 0
          ? m("div.empty-history", [
              m("span.empty-icon", "📜"),
              m("h4.empty-title", "No recorded games yet"),
              m(
                "p.empty-desc",
                settings.recordHistory
                  ? "Finish a game in-person or with Delta Chat friends to see your game records and replay moves."
                  : "Game recording is currently turned off in storage settings.",
              ),
              m(
                "button.btn-empty-play",
                {
                  onclick: () => switchView("play-person"),
                },
                "Start a Match",
              ),
            ])
          : m("div.history-list", [
              history.map((entry) => renderHistoryCard(entry, isSelectionMode)),
            ]),
      ]),

      // Modal: History Retention & Storage Settings
      showRetentionModal ? renderRetentionModal() : null,
    ]);
  },
};

function renderHistoryCard(entry: GameHistoryEntry, selectionMode: boolean) {
  const isSelected = selectedGameIds.has(entry.id);

  let outcomeBadge = "Draw";
  let outcomeClass = "badge-draw";
  if (entry.winner === "w") {
    outcomeBadge = "White Won";
    outcomeClass = "badge-white-win";
  } else if (entry.winner === "b") {
    outcomeBadge = "Black Won";
    outcomeClass = "badge-black-win";
  }

  return m(
    "div.history-card",
    {
      class: isSelected ? "selected" : "",
      onclick: (e: any) => {
        if (selectionMode) {
          if (isSelected) selectedGameIds.delete(entry.id);
          else selectedGameIds.add(entry.id);
        }
      },
    },
    [
      selectionMode
        ? m("div.checkbox-wrap", [
            m("input.history-checkbox", {
              type: "checkbox",
              checked: isSelected,
              onclick: (e: any) => e.stopPropagation(),
              onchange: () => {
                if (isSelected) selectedGameIds.delete(entry.id);
                else selectedGameIds.add(entry.id);
              },
            }),
          ])
        : null,

      m("div.history-card-main", [
        m("div.card-header-row", [
          m("span.history-date", entry.dateStr),
          m(
            "span.history-mode-pill",
            entry.mode === "online" ? "Delta Chat" : "In-Person",
          ),
          m("span.history-result-badge", { class: outcomeClass }, outcomeBadge),
        ]),

        m("div.players-row", [
          m("div.player-side", [
            m("span.color-dot.white"),
            m("strong.player-name", entry.whiteName),
          ]),
          m("span.vs-divider", "vs"),
          m("div.player-side", [
            m("span.color-dot.black"),
            m("strong.player-name", entry.blackName),
          ]),
        ]),

        m("div.card-meta-row", [
          m("span.meta-badge", entry.variantName || "Standard"),
          m("span.meta-badge", entry.timeControl || "No Clock"),
          m("span.meta-badge", `${entry.moves?.length || 0} moves`),
          entry.resultReason
            ? m("span.reason-text", `• ${entry.resultReason}`)
            : null,
        ]),
      ]),

      !selectionMode
        ? m("div.card-actions-col", [
            m(
              "button.btn-review-game",
              {
                onclick: (e: any) => {
                  e.stopPropagation();
                  startReplay(entry);
                },
              },
              "Replay ♟️",
            ),
            m(
              "button.btn-delete-single",
              {
                title: "Delete this game",
                onclick: (e: any) => {
                  e.stopPropagation();
                  if (confirm("Delete this game record?")) {
                    deleteGameById(entry.id);
                    m.redraw();
                  }
                },
              },
              "🗑️",
            ),
          ])
        : null,
    ],
  );
}

function renderRetentionModal() {
  const settings = getSettings();

  return m("div.modal-backdrop", [
    m("div.modal-dialog", [
      m("div.modal-header", [
        m("h3.modal-title", "History Storage Settings"),
        m(
          "button.btn-modal-close",
          {
            onclick: () => {
              showRetentionModal = false;
            },
          },
          "✕",
        ),
      ]),

      m("div.modal-body", [
        // Toggle record history
        m("div.form-toggle-row", [
          m("div.toggle-labels", [
            m("strong", "Record Game History"),
            m(
              "span.toggle-hint",
              "Save completed matches locally to replay and analyze later.",
            ),
          ]),
          m("input.toggle-switch", {
            type: "checkbox",
            checked: settings.recordHistory,
            onchange: (e: any) => {
              saveSettings({ recordHistory: e.target.checked });
            },
          }),
        ]),

        // Auto-prune policy
        m("div.form-group.mt-4", [
          m("label.form-label", "Auto-Delete Older Games"),
          m("div.choice-pills", [
            m(
              "button.choice-pill",
              {
                class: settings.historyRetention === "1week" ? "active" : "",
                onclick: () => {
                  saveSettings({ historyRetention: "1week" });
                },
              },
              "After 1 Week",
            ),
            m(
              "button.choice-pill",
              {
                class: settings.historyRetention === "1month" ? "active" : "",
                onclick: () => {
                  saveSettings({ historyRetention: "1month" });
                },
              },
              "After 1 Month",
            ),
            m(
              "button.choice-pill",
              {
                class: settings.historyRetention === "never" ? "active" : "",
                onclick: () => {
                  saveSettings({ historyRetention: "never" });
                },
              },
              "Never Delete",
            ),
          ]),
        ]),

        // Clear all history button
        m("div.danger-zone", [
          m(
            "button.btn-danger-clear",
            {
              onclick: () => {
                if (
                  confirm(
                    "Are you sure you want to delete ALL game history records?",
                  )
                ) {
                  clearAllGameHistory();
                  showRetentionModal = false;
                  m.redraw();
                }
              },
            },
            "Delete All Game History Records",
          ),
        ]),
      ]),

      m("div.modal-footer", [
        m(
          "button.btn-modal-submit",
          {
            onclick: () => {
              showRetentionModal = false;
            },
          },
          "Done",
        ),
      ]),
    ]),
  ]);
}

function startReplay(entry: GameHistoryEntry) {
  state.reviewGameEntry = entry;
  state.reviewStep = 0;
  state.inReplayMode = true;
  switchView("history-review");
}

export const HistoryReviewComponent: m.Component = {
  oncreate: (vnode) => {
    initReviewBoard(vnode.dom);
  },
  onremove: () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
    if (reviewBoardInstance) {
      reviewBoardInstance.destroy();
      reviewBoardInstance = null;
    }
  },
  view: () => {
    const entry = state.reviewGameEntry;
    if (!entry) return null;

    const totalSteps = entry.fens ? entry.fens.length - 1 : 0;
    const currentStep = state.reviewStep;
    const moves = entry.moves || [];
    const isPlaying = autoPlayInterval !== null;

    return m("div.review-screen", [
      // Header
      m("div.review-header", [
        m(
          "button.btn-back",
          {
            onclick: () => {
              if (autoPlayInterval) clearInterval(autoPlayInterval);
              state.currentView = "history";
              m.redraw();
            },
          },
          "← History List",
        ),
        m("div.review-matchup", [
          m("span.player-tag", `${entry.whiteName} (W)`),
          m("span.vs-mark", "vs"),
          m("span.player-tag", `${entry.blackName} (B)`),
        ]),
        m("span.review-result", entry.resultReason || "Replay"),
      ]),

      // Main Review Stage
      m("div.review-layout", [
        // Left: Board
        m("div.review-board-col", [
          m("div.board-container-wrap", [m("div#review-board.board-box")]),

          // Step Controls
          m("div.review-controls-bar", [
            m(
              "button.btn-ctrl",
              {
                title: "First move (Start)",
                disabled: currentStep === 0,
                onclick: () => goToStep(0),
              },
              "|◀",
            ),
            m(
              "button.btn-ctrl",
              {
                title: "Previous move",
                disabled: currentStep === 0,
                onclick: () => goToStep(currentStep - 1),
              },
              "◀",
            ),
            m(
              "button.btn-ctrl.btn-ctrl-play",
              {
                title: isPlaying ? "Pause replay" : "Auto-play moves",
                onclick: () => toggleAutoPlay(totalSteps),
              },
              isPlaying ? "⏸" : "▶",
            ),
            m(
              "button.btn-ctrl",
              {
                title: "Next move",
                disabled: currentStep >= totalSteps,
                onclick: () => goToStep(currentStep + 1),
              },
              "▶",
            ),
            m(
              "button.btn-ctrl",
              {
                title: "Last move (End)",
                disabled: currentStep >= totalSteps,
                onclick: () => goToStep(totalSteps),
              },
              "▶|",
            ),
          ]),
          m("div.step-indicator", `Move ${currentStep} of ${totalSteps}`),
        ]),

        // Right: Move Notation List
        m("div.review-moves-col", [
          m("h4.moves-heading", "Move Notation"),
          m("div.moves-scroll-container", [
            renderMoveListGrid(moves, currentStep),
          ]),
        ]),
      ]),
    ]);
  },
};

function renderMoveListGrid(moves: string[], currentStep: number) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moves[i];
    const blackMove = moves[i + 1] || "";

    const isWhiteActive = currentStep === i + 1;
    const isBlackActive = currentStep === i + 2;

    rows.push(
      m("div.move-row", { key: moveNumber }, [
        m("span.move-num", `${moveNumber}.`),
        m(
          "span.move-san",
          {
            class: isWhiteActive ? "active-step" : "",
            onclick: () => goToStep(i + 1),
          },
          whiteMove,
        ),
        blackMove
          ? m(
              "span.move-san",
              {
                class: isBlackActive ? "active-step" : "",
                onclick: () => goToStep(i + 2),
              },
              blackMove,
            )
          : m("span.move-san.empty"),
      ]),
    );
  }
  return rows;
}

function initReviewBoard(dom: Element) {
  const boardEl = dom.querySelector("#review-board");
  if (!boardEl) return;

  const entry = state.reviewGameEntry;
  const initialFen =
    entry && entry.fens && entry.fens[0] ? entry.fens[0] : "start";

  // @ts-ignore
  if (typeof Chessboard !== "undefined") {
    // @ts-ignore
    reviewBoardInstance = Chessboard("review-board", {
      position: initialFen,
      showNotation: true,
      draggable: false,
      pieceTheme: (piece: string) => getPieceImagePath(piece),
    });
  }
}

function goToStep(step: number) {
  const entry = state.reviewGameEntry;
  if (!entry || !entry.fens) return;

  const boundedStep = Math.max(0, Math.min(step, entry.fens.length - 1));
  state.reviewStep = boundedStep;

  if (reviewBoardInstance) {
    reviewBoardInstance.position(entry.fens[boundedStep], false);
  }
  sound.playMove();
  m.redraw();
}

function toggleAutoPlay(totalSteps: number) {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
    m.redraw();
    return;
  }

  if (state.reviewStep >= totalSteps) {
    state.reviewStep = 0;
  }

  autoPlayInterval = window.setInterval(() => {
    if (state.reviewStep < totalSteps) {
      goToStep(state.reviewStep + 1);
    } else {
      if (autoPlayInterval) clearInterval(autoPlayInterval);
      autoPlayInterval = null;
      m.redraw();
    }
  }, 1000);
  m.redraw();
}
