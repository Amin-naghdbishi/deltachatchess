// @ts-check
import m from "mithril";
import { state, switchView, normalizeName } from "../common";
import { loadAllHistory } from "../history";
import { getUserName, saveUserName } from "../settings";

let isEditingName = false;
let editNameValue = "";

export const HomeComponent: m.Component = {
  oninit: () => {
    editNameValue = getUserName();
  },
  view: () => {
    const historyCount = loadAllHistory().length;
    const hasActiveGame = state.moveHistory.length > 0 && !state.isGameOver;
    const currentName = getUserName();

    return m("div.home-minimal-container", [
      // Name edit modal
      isEditingName
        ? m("div.minimal-modal-overlay", [
            m("div.minimal-modal-card", [
              m("h3.minimal-modal-title", "Player Name"),
              m("input.minimal-input", {
                type: "text",
                value: editNameValue,
                placeholder: "Your Name",
                maxlength: 20,
                autofocus: true,
                oninput: (e: any) => {
                  editNameValue = e.target.value;
                },
                onkeydown: (e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    saveUserName(editNameValue);
                    isEditingName = false;
                    m.redraw();
                  } else if (e.key === "Escape") {
                    isEditingName = false;
                    m.redraw();
                  }
                },
              }),
              m("div.minimal-modal-actions", [
                m(
                  "button.btn-minimal-secondary",
                  {
                    onclick: () => {
                      isEditingName = false;
                    },
                  },
                  "Cancel",
                ),
                m(
                  "button.btn-minimal-primary",
                  {
                    onclick: () => {
                      saveUserName(editNameValue);
                      isEditingName = false;
                    },
                  },
                  "Save",
                ),
              ]),
            ]),
          ])
        : null,

      // Main minimalist content
      m("div.home-minimal-content", [
        // Title
        m("div.home-header", [
          m("h1.home-title", "Chess"),
          m(
            "button.home-player-pill",
            {
              title: "Click to change name",
              onclick: () => {
                editNameValue = getUserName();
                isEditingName = true;
              },
            },
            [
              m("span.player-name-text", normalizeName(currentName)),
              m("span.player-edit-icon", "✎"),
            ],
          ),
        ]),

        // Active game resume (compact and subtle)
        hasActiveGame
          ? m(
              "button.resume-strip",
              {
                onclick: () => switchView("game"),
              },
              [
                m("span.resume-dot", "●"),
                m("span", `Resume Game (${state.moveHistory.length} moves)`),
                m("span.resume-arrow", "→"),
              ],
            )
          : null,

        // Primary Menu Actions
        m("div.home-nav-stack", [
          m(
            "button.home-nav-btn.btn-hero",
            {
              onclick: () => switchView("play-person"),
            },
            [
              m("span.nav-label", "Play in Person"),
              m("span.nav-arrow", "→"),
            ],
          ),

          m(
            "button.home-nav-btn",
            {
              onclick: () => switchView("play-online"),
            },
            [
              m("span.nav-label", "Play Online"),
              m("span.nav-sublabel", "Delta Chat"),
            ],
          ),

          m(
            "button.home-nav-btn",
            {
              onclick: () => switchView("history"),
            },
            [
              m("span.nav-label", "Game History"),
              historyCount > 0 ? m("span.nav-badge", `${historyCount}`) : null,
            ],
          ),

          m(
            "button.home-nav-btn",
            {
              onclick: () => switchView("settings"),
            },
            [
              m("span.nav-label", "Theme & Appearance"),
            ],
          ),
        ]),

        // Bottom gear icon
        m("div.home-bottom-tools", [
          m(
            "button.home-gear-btn",
            {
              title: "Settings",
              onclick: () => switchView("settings"),
            },
            "⚙",
          ),
        ]),
      ]),
    ]);
  },
};
