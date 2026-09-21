// @ts-check
import m from "mithril";
import { state, switchView, normalizeName, OnlineChallenge, resetGame } from "../common";
import { VARIANTS, VARIANTS_LIST, VariantId } from "../variants";
import { TIME_CONTROL_PRESETS } from "../clock";

let showCreateModal = false;
let selectedColor: "white" | "black" | "random" = "random";
let selectedVariantId: VariantId = "standard";
let selectedPresetIndex = 5; // Default: 5 min Blitz

export const PlayPeopleComponent: m.Component = {
  view: () => {
    const myAddr = window.webxdc ? window.webxdc.selfAddr : "device0@local.host";
    const myName = window.webxdc ? window.webxdc.selfName : "device0";

    const openChallenges = state.openChallenges || [];
    const myChallenge = openChallenges.find((c) => c.creatorAddr === myAddr);
    const otherChallenges = openChallenges.filter((c) => c.creatorAddr !== myAddr);

    const hasActiveOnlineGame =
      state.gameMode === "online" &&
      state.whiteAddr &&
      state.blackAddr &&
      !state.isGameOver;

    const isParticipantInActiveGame =
      hasActiveOnlineGame &&
      (myAddr === state.whiteAddr || myAddr === state.blackAddr);

    return m("div.lobby-screen", [
      // Top Navigation
      m("div.lobby-header", [
        m(
          "button.btn-back",
          {
            onclick: () => switchView("home"),
          },
          "← Back to Menu",
        ),
        m("h2.lobby-title", "Delta Chat Multiplayer"),
        m("div.header-user-pill", [
          m("span.dot-online"),
          m("span.user-badge-name", normalizeName(myName)),
        ]),
      ]),

      m("div.lobby-body", [
        // Banner: Active Game in Progress in Chat
        hasActiveOnlineGame
          ? m("div.active-game-banner", [
              m("div.banner-info", [
                m("span.live-tag", "LIVE MATCH"),
                m("strong", `${normalizeName(state.whiteName)} 🆚 ${normalizeName(state.blackName)}`),
                m(
                  "span.banner-meta",
                  `• ${VARIANTS[state.variantId]?.name || "Standard"} • ${state.timeControlLabel} • ${state.moveHistory.length} moves`,
                ),
              ]),
              m(
                "button.btn-join-match",
                {
                  onclick: () => switchView("game"),
                },
                isParticipantInActiveGame ? "Resume Game →" : "Watch / Spectate 👁️",
              ),
            ])
          : null,

        // Top Action Bar
        m("div.lobby-actions-row", [
          m("div.lobby-stats", [
            m("h3.lobby-subheading", "Open Challenges in Chat"),
            m(
              "p.lobby-desc",
              "Accept an open challenge from a chat member or post your own proposal below.",
            ),
          ]),
          !myChallenge
            ? m(
                "button.btn-create-challenge",
                {
                  onclick: () => {
                    showCreateModal = true;
                  },
                },
                "+ Create Challenge",
              )
            : m(
                "button.btn-cancel-own-challenge",
                {
                  onclick: () => cancelChallenge(myChallenge.id),
                },
                "Cancel My Challenge",
              ),
        ]),

        // Active Challenges List
        m("div.challenges-list-wrap", [
          openChallenges.length === 0
            ? m("div.empty-lobby", [
                m("span.empty-icon", "♟️"),
                m("h4.empty-title", "No open challenges right now"),
                m(
                  "p.empty-text",
                  "Create a challenge with your preferred variant and time control to invite other chat members!",
                ),
                m(
                  "button.btn-empty-create",
                  {
                    onclick: () => {
                      showCreateModal = true;
                    },
                  },
                  "Post First Challenge",
                ),
              ])
            : m("div.challenges-grid", [
                // Display my challenge first if exists
                myChallenge ? renderChallengeCard(myChallenge, true, myAddr) : null,
                // Display all other challenges
                otherChallenges.map((c) => renderChallengeCard(c, false, myAddr)),
              ]),
        ]),
      ]),

      // Modal: Create Challenge
      showCreateModal ? renderCreateModal(myAddr, myName) : null,
    ]);
  },
};

function renderChallengeCard(challenge: OnlineChallenge, isMine: boolean, myAddr: string) {
  const variant = VARIANTS[challenge.variantId] || VARIANTS.standard;

  return m(
    "div.challenge-card",
    {
      class: isMine ? "is-mine" : "",
    },
    [
      m("div.challenge-card-top", [
        m("div.challenger-identity", [
          m("div.avatar-circle", challenge.creatorName.charAt(0).toUpperCase()),
          m("div.challenger-details", [
            m("strong.challenger-name", normalizeName(challenge.creatorName)),
            isMine ? m("span.you-badge", "You") : null,
          ]),
        ]),
        m("span.clock-pill", challenge.timeControlLabel),
      ]),

      m("div.challenge-meta-row", [
        m("div.meta-item", [
          m("span.meta-label", "Variant:"),
          m("span.meta-val", variant.name),
        ]),
        m("div.meta-item", [
          m("span.meta-label", "Side:"),
          m(
            "span.meta-val",
            challenge.preferredColor === "white"
              ? "White"
              : challenge.preferredColor === "black"
                ? "Black"
                : "Random",
          ),
        ]),
      ]),

      m("div.challenge-card-bottom", [
        isMine
          ? m(
              "button.btn-card-cancel",
              {
                onclick: () => cancelChallenge(challenge.id),
              },
              "Withdraw",
            )
          : m(
              "button.btn-card-accept",
              {
                onclick: () => acceptChallenge(challenge),
              },
              "Accept & Play ⚔️",
            ),
      ]),
    ],
  );
}

function renderCreateModal(myAddr: string, myName: string) {
  return m(
    "div.modal-backdrop",
    {
      onclick: (e: any) => {
        if (e.target === e.currentTarget) {
          showCreateModal = false;
        }
      },
    },
    [
      m(
        "div.modal-dialog",
        {
          onclick: (e: any) => e.stopPropagation(),
        },
        [
      m("div.modal-header", [
        m("h3.modal-title", "Post Chess Challenge"),
        m(
          "button.btn-modal-close",
          {
            onclick: () => {
              showCreateModal = false;
            },
          },
          "✕",
        ),
      ]),

      m("div.modal-body", [
        // Side Preference
        m("div.form-group", [
          m("label.form-label", "Your Preferred Color"),
          m("div.choice-pills", [
            m(
              "button.choice-pill",
              {
                class: selectedColor === "white" ? "active" : "",
                onclick: () => {
                  selectedColor = "white";
                },
              },
              [m("span.pill-dot.dot-white"), "White"],
            ),
            m(
              "button.choice-pill",
              {
                class: selectedColor === "random" ? "active" : "",
                onclick: () => {
                  selectedColor = "random";
                },
              },
              [m("span.pill-emoji", "🎲"), "Random"],
            ),
            m(
              "button.choice-pill",
              {
                class: selectedColor === "black" ? "active" : "",
                onclick: () => {
                  selectedColor = "black";
                },
              },
              [m("span.pill-dot.dot-black"), "Black"],
            ),
          ]),
        ]),

        // Variant Selection
        m("div.form-group", [
          m("label.form-label", "Variant"),
          m("div.select-variant-row", [
            VARIANTS_LIST.map((v) =>
              m(
                "button.variant-chip",
                {
                  class: selectedVariantId === v.id ? "active" : "",
                  onclick: () => {
                    selectedVariantId = v.id;
                  },
                },
                v.name,
              ),
            ),
          ]),
        ]),

        // Time Control
        m("div.form-group", [
          m("label.form-label", "Time Control"),
          m("div.clock-presets-grid.grid-modal", [
            TIME_CONTROL_PRESETS.map((tc, idx) =>
              m(
                "button.clock-preset-btn",
                {
                  class: selectedPresetIndex === idx ? "active" : "",
                  onclick: () => {
                    selectedPresetIndex = idx;
                  },
                },
                [m("span.preset-label", tc.label), m("span.preset-cat", tc.category)],
              ),
            ),
          ]),
        ]),
      ]),

      m("div.modal-footer", [
        m(
          "button.btn-modal-cancel",
          {
            onclick: () => {
              showCreateModal = false;
            },
          },
          "Cancel",
        ),
        m(
          "button.btn-modal-submit",
          {
            onclick: () => {
              createAndPostChallenge(myAddr, myName);
              showCreateModal = false;
            },
          },
          "Post to Chat 🚀",
        ),
      ]),
    ]),
  ]);
}

function createAndPostChallenge(creatorAddr: string, creatorName: string) {
  const preset = TIME_CONTROL_PRESETS[selectedPresetIndex];
  const challenge: OnlineChallenge = {
    id: "ch_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    creatorAddr,
    creatorName,
    variantId: selectedVariantId,
    timeControlSeconds: preset.initialSeconds,
    timeControlIncrement: preset.incrementSeconds,
    timeControlLabel: preset.label,
    preferredColor: selectedColor,
    createdAt: Date.now(),
  };

  if (!state.openChallenges) state.openChallenges = [];
  state.openChallenges.push(challenge);

  const variantName = VARIANTS[selectedVariantId]?.name || "Standard";
  const info = `${normalizeName(creatorName)} wants to play ${variantName} (${preset.label})`;

  if (window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "challenge_create",
          challenge,
          // Backwards compatibility fields for legacy clients:
          whiteAddr: creatorAddr,
          whiteName: creatorName,
        },
        info,
        summary: info,
        notify: { "*": info },
      },
      "",
    );
  }
  m.redraw();
}

function cancelChallenge(challengeId: string) {
  if (state.openChallenges) {
    state.openChallenges = state.openChallenges.filter((c) => c.id !== challengeId);
  }
  if (window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "challenge_cancel",
          challengeId,
        },
        info: "Challenge cancelled",
      },
      "",
    );
  }
  m.redraw();
}

function acceptChallenge(challenge: OnlineChallenge) {
  const myAddr = window.webxdc ? window.webxdc.selfAddr : "device1@local.host";
  const myName = window.webxdc ? window.webxdc.selfName : "device1";

  let whiteAddr: string;
  let whiteName: string;
  let blackAddr: string;
  let blackName: string;

  if (challenge.preferredColor === "white") {
    whiteAddr = challenge.creatorAddr;
    whiteName = challenge.creatorName;
    blackAddr = myAddr;
    blackName = myName;
  } else if (challenge.preferredColor === "black") {
    whiteAddr = myAddr;
    whiteName = myName;
    blackAddr = challenge.creatorAddr;
    blackName = challenge.creatorName;
  } else {
    // Random side selection
    const coin = Math.random() < 0.5;
    whiteAddr = coin ? challenge.creatorAddr : myAddr;
    whiteName = coin ? challenge.creatorName : myName;
    blackAddr = coin ? myAddr : challenge.creatorAddr;
    blackName = coin ? myName : challenge.creatorName;
  }

  const def = VARIANTS[challenge.variantId] || VARIANTS.standard;
  const initialFen = def.getInitialFen();
  const gameId = "game_" + Date.now();

  const info = `Game started: ${normalizeName(whiteName)} 🆚 ${normalizeName(blackName)}`;

  if (window.webxdc) {
    window.webxdc.sendUpdate(
      {
        payload: {
          type: "game_start",
          gameId,
          challengeId: challenge.id,
          whiteAddr,
          whiteName,
          blackAddr,
          blackName,
          variantId: challenge.variantId,
          initialFen,
          timeControlSeconds: challenge.timeControlSeconds,
          timeControlIncrement: challenge.timeControlIncrement,
          timeControlLabel: challenge.timeControlLabel,
        },
        info,
        summary: info,
        notify: { "*": info },
      },
      "",
    );
  } else {
    // Standalone / Preview environment fallback
    state.whiteAddr = whiteAddr;
    state.whiteName = whiteName;
    state.blackAddr = blackAddr;
    state.blackName = blackName;
    state.activeGameId = gameId;
    if (state.openChallenges) {
      state.openChallenges = state.openChallenges.filter((c) => c.id !== challenge.id);
    }
    resetGame(
      challenge.variantId,
      challenge.timeControlSeconds,
      challenge.timeControlIncrement,
      challenge.timeControlLabel,
      "online",
      "none",
    );
    if ((challenge.timeControlSeconds || 0) > 0) {
      state.clock.start("w");
    }
    switchView("game");
  }
}
