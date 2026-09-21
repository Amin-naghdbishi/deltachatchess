// @ts-check
import m from "mithril";
import { state, switchView, resetGame } from "../common";
import { VariantId, VARIANTS } from "../variants";
import { TIME_CONTROL_PRESETS, TimeControlConfig } from "../clock";
import { InPersonOrientationMode, getSettings, getUserName } from "../settings";

let selectedVariant: VariantId = "standard";
let selectedTimeControl = TIME_CONTROL_PRESETS[7]; // 10+0
let selectedColor: "white" | "random" | "black" = "white";
let selectedOrientation: InPersonOrientationMode = "none";
let showMoreVariantsModal = false;
let showMoreTimeModal = false;

const QUICK_VARIANTS: VariantId[] = ["standard", "chess960"];
const ALL_VARIANTS: Array<{ id: VariantId; name: string }> = [
  { id: "standard", name: "Standard" },
  { id: "chess960", name: "Chess960" },
  { id: "threeCheck", name: "Three-check" },
  { id: "kingOfTheHill", name: "King of the Hill" },
  { id: "antichess", name: "Antichess" },
  { id: "atomic", name: "Atomic" },
  { id: "horde", name: "Horde" },
  { id: "racingKings", name: "Racing Kings" },
];

const QUICK_TIMES: TimeControlConfig[] = [
  TIME_CONTROL_PRESETS[7], // 10+0
  TIME_CONTROL_PRESETS[6], // 5+3
  TIME_CONTROL_PRESETS[4], // 3+2
  TIME_CONTROL_PRESETS[0], // No Clock
];

export const PlayPersonComponent: m.Component = {
  oninit: () => {
    selectedOrientation = getSettings().inPersonOrientation;
  },
  view: () => {
    const isCustomVariant = !QUICK_VARIANTS.includes(selectedVariant);
    const isCustomTime = !QUICK_TIMES.some(
      (t) =>
        t.initialSeconds === selectedTimeControl.initialSeconds &&
        t.incrementSeconds === selectedTimeControl.incrementSeconds,
    );

    return m("div.subpage-container", [
      // Minimal Header
      m("div.subpage-header", [
        m(
          "button.btn-back-minimal",
          {
            onclick: () => switchView("home"),
          },
          "← Back",
        ),
        m("h2.subpage-title", "Play in Person"),
        m("div.subpage-spacer"),
      ]),

      // Modal: More Variants
      showMoreVariantsModal
        ? m("div.minimal-modal-overlay", [
            m("div.minimal-modal-card", [
              m("h3.minimal-modal-title", "Select Variant"),
              m(
                "div.variant-select-list",
                ALL_VARIANTS.map((v) =>
                  m(
                    "button.variant-list-item",
                    {
                      class: selectedVariant === v.id ? "active" : "",
                      onclick: () => {
                        selectedVariant = v.id;
                        showMoreVariantsModal = false;
                      },
                    },
                    [
                      m("span.variant-item-name", v.name),
                      selectedVariant === v.id ? m("span.check-mark", "✓") : null,
                    ],
                  ),
                ),
              ),
              m(
                "button.btn-minimal-secondary.w-full",
                {
                  onclick: () => {
                    showMoreVariantsModal = false;
                  },
                },
                "Close",
              ),
            ]),
          ])
        : null,

      // Modal: More Time Controls
      showMoreTimeModal
        ? m("div.minimal-modal-overlay", [
            m("div.minimal-modal-card", [
              m("h3.minimal-modal-title", "Select Time Control"),
              m(
                "div.time-select-grid",
                TIME_CONTROL_PRESETS.map((tc) =>
                  m(
                    "button.time-grid-item",
                    {
                      class:
                        selectedTimeControl.initialSeconds === tc.initialSeconds &&
                        selectedTimeControl.incrementSeconds === tc.incrementSeconds
                          ? "active"
                          : "",
                      onclick: () => {
                        selectedTimeControl = tc;
                        showMoreTimeModal = false;
                      },
                    },
                    tc.label,
                  ),
                ),
              ),
              m(
                "button.btn-minimal-secondary.w-full",
                {
                  onclick: () => {
                    showMoreTimeModal = false;
                  },
                },
                "Close",
              ),
            ]),
          ])
        : null,

      // Compact Form Body
      m("div.compact-setup-body", [
        // 1. Variant Selector
        m("div.setup-group", [
          m("span.setup-label", "Variant"),
          m("div.segmented-row", [
            m(
              "button.seg-btn",
              {
                class: selectedVariant === "standard" ? "active" : "",
                onclick: () => {
                  selectedVariant = "standard";
                },
              },
              "Standard",
            ),
            m(
              "button.seg-btn",
              {
                class: selectedVariant === "chess960" ? "active" : "",
                onclick: () => {
                  selectedVariant = "chess960";
                },
              },
              "Chess960",
            ),
            m(
              "button.seg-btn",
              {
                class: isCustomVariant ? "active" : "",
                onclick: () => {
                  showMoreVariantsModal = true;
                },
              },
              isCustomVariant
                ? ALL_VARIANTS.find((v) => v.id === selectedVariant)?.name || "More…"
                : "More ▾",
            ),
          ]),
        ]),

        // 2. Time Selector
        m("div.setup-group", [
          m("span.setup-label", "Time"),
          m("div.segmented-row", [
            QUICK_TIMES.map((tc) =>
              m(
                "button.seg-btn",
                {
                  class:
                    selectedTimeControl.initialSeconds === tc.initialSeconds &&
                    selectedTimeControl.incrementSeconds === tc.incrementSeconds
                      ? "active"
                      : "",
                  onclick: () => {
                    selectedTimeControl = tc;
                  },
                },
                tc.label,
              ),
            ),
            m(
              "button.seg-btn",
              {
                class: isCustomTime ? "active" : "",
                onclick: () => {
                  showMoreTimeModal = true;
                },
              },
              isCustomTime ? selectedTimeControl.label : "More ▾",
            ),
          ]),
        ]),

        // 3. Board Orientation Mode
        m("div.setup-group", [
          m("span.setup-label", "Board Orientation"),
          m("div.segmented-row", [
            m(
              "button.seg-btn",
              {
                class: selectedOrientation === "none" ? "active" : "",
                title: "Board stays fixed in current orientation",
                onclick: () => {
                  selectedOrientation = "none";
                },
              },
              "No Flip",
            ),
            m(
              "button.seg-btn",
              {
                class: selectedOrientation === "flip" ? "active" : "",
                title: "Flips board pieces 180° for face-to-face table play",
                onclick: () => {
                  selectedOrientation = "flip";
                },
              },
              "Flip Board",
            ),
            m(
              "button.seg-btn",
              {
                class: selectedOrientation === "rotate" ? "active" : "",
                title: "Pieces rotate 180° for Black player across the board",
                onclick: () => {
                  selectedOrientation = "rotate";
                },
              },
              "Rotate Screen",
            ),
          ]),
          m(
            "p.setup-hint",
            selectedOrientation === "none"
              ? "Fixed orientation."
              : selectedOrientation === "flip"
                ? "Board flips 180° each turn (Face-to-Face across table)."
                : "Screen stays fixed while pieces rotate 180° (Face-to-Face play).",
          ),
        ]),

        // 4. Color / Side
        m("div.setup-group", [
          m("span.setup-label", "First Move"),
          m("div.segmented-row", [
            m(
              "button.seg-btn",
              {
                class: selectedColor === "white" ? "active" : "",
                onclick: () => {
                  selectedColor = "white";
                },
              },
              "White",
            ),
            m(
              "button.seg-btn",
              {
                class: selectedColor === "random" ? "active" : "",
                onclick: () => {
                  selectedColor = "random";
                },
              },
              "Random",
            ),
            m(
              "button.seg-btn",
              {
                class: selectedColor === "black" ? "active" : "",
                onclick: () => {
                  selectedColor = "black";
                },
              },
              "Black",
            ),
          ]),
        ]),

        // Start Button
        m(
          "button.btn-start-minimal",
          {
            onclick: () => {
              const uName = getUserName();
              let wName = uName;
              let bName = "Opponent";

              if (selectedColor === "black") {
                wName = "Opponent";
                bName = uName;
              } else if (selectedColor === "random" && Math.random() > 0.5) {
                wName = "Opponent";
                bName = uName;
              }

              state.whiteName = wName;
              state.blackName = bName;

              resetGame(
                selectedVariant,
                selectedTimeControl.initialSeconds,
                selectedTimeControl.incrementSeconds,
                selectedTimeControl.label,
                "person",
                selectedOrientation,
              );

              if (selectedTimeControl.initialSeconds > 0) {
                state.clock.start("w");
              }

              switchView("game");
            },
          },
          "Start Game",
        ),
      ]),
    ]);
  },
};
