// @ts-check
import m from "mithril";
import { switchView } from "../common";
import {
  getSettings,
  saveSettings,
  BUILTIN_THEMES,
  getCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  findTheme,
  ChessThemePalette,
  PIECE_STYLES,
  getPieceImagePath,
  AVATAR_OPTIONS,
  getAvatarImagePath,
} from "../settings";
import { sound } from "../audio";

let isEditingTheme = false;
let editingTheme: ChessThemePalette = createDefaultNewTheme();

function createDefaultNewTheme(): ChessThemePalette {
  return {
    id: "custom_" + Date.now(),
    name: "My Custom Theme",
    isCustom: true,
    bgPrimary: "#18181b",
    bgSurface: "#27272a",
    textPrimary: "#fafafa",
    textSecondary: "#a1a1aa",
    boardLight: "#e4e4e7",
    boardDark: "#71717a",
    accent: "#3b82f6",
    sqSelected: "rgba(59, 130, 246, 0.5)",
    sqLegalDot: "rgba(24, 24, 27, 0.35)",
    sqLastMove: "rgba(59, 130, 246, 0.35)",
  };
}

export const SettingsComponent: m.Component = {
  view: () => {
    const settings = getSettings();
    const builtinList = Object.values(BUILTIN_THEMES);
    const customList = getCustomThemes();
    const allThemes = [...builtinList, ...customList];

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
        m("h2.subpage-title", "Theme & Appearance"),
        m("div.subpage-spacer"),
      ]),

      // Theme Editor Modal
      isEditingTheme
        ? m("div.minimal-modal-overlay", [
            m("div.theme-editor-card", [
              m("div.theme-editor-header", [
                m(
                  "h3.minimal-modal-title",
                  editingTheme.name || "Custom Theme",
                ),
                m(
                  "button.btn-close-minimal",
                  {
                    onclick: () => {
                      isEditingTheme = false;
                    },
                  },
                  "✕",
                ),
              ]),

              // Live Mini Preview
              m("div.theme-mini-preview-wrap", [
                m(
                  "div.theme-mini-board",
                  {
                    style: {
                      backgroundColor: editingTheme.bgSurface,
                      borderColor: editingTheme.accent,
                    },
                  },
                  [
                    // 4x4 mini chessboard preview
                    [0, 1, 2, 3].map((r) =>
                      m(
                        "div.mini-row",
                        { key: r },
                        [0, 1, 2, 3].map((c) => {
                          const isLight = (r + c) % 2 === 0;
                          const isSelected = r === 1 && c === 1;
                          const isLastMove = r === 2 && c === 1;
                          const hasLegalDot = r === 0 && c === 1;

                          let bg = isLight
                            ? editingTheme.boardLight
                            : editingTheme.boardDark;
                          if (isSelected) bg = editingTheme.sqSelected;
                          else if (isLastMove) bg = editingTheme.sqLastMove;

                          return m(
                            "div.mini-sq",
                            {
                              key: c,
                              style: { backgroundColor: bg },
                            },
                            [
                              hasLegalDot
                                ? m("div.mini-dot", {
                                    style: {
                                      backgroundColor: editingTheme.sqLegalDot,
                                    },
                                  })
                                : null,
                            ],
                          );
                        }),
                      ),
                    ),
                  ],
                ),
                m(
                  "div.mini-preview-labels",
                  { style: { color: editingTheme.textPrimary } },
                  [
                    m(
                      "span.mini-name-preview",
                      editingTheme.name || "Theme Name",
                    ),
                    m(
                      "span.mini-accent-tag",
                      {
                        style: {
                          backgroundColor: editingTheme.accent,
                          color: "#fff",
                        },
                      },
                      "Accent",
                    ),
                  ],
                ),
              ]),

              // Color Pickers List
              m("div.theme-editor-form", [
                m("div.editor-field", [
                  m("label.editor-label", "Theme Name"),
                  m("input.minimal-input", {
                    type: "text",
                    value: editingTheme.name,
                    maxlength: 24,
                    oninput: (e: any) => {
                      editingTheme.name = e.target.value;
                    },
                  }),
                ]),

                m("div.color-pickers-grid", [
                  m("div.color-field-item", [
                    m("label.color-label", "Light Square"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.boardLight.startsWith("#")
                        ? editingTheme.boardLight
                        : "#eeeeee",
                      oninput: (e: any) => {
                        editingTheme.boardLight = e.target.value;
                      },
                    }),
                  ]),

                  m("div.color-field-item", [
                    m("label.color-label", "Dark Square"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.boardDark.startsWith("#")
                        ? editingTheme.boardDark
                        : "#555555",
                      oninput: (e: any) => {
                        editingTheme.boardDark = e.target.value;
                      },
                    }),
                  ]),

                  m("div.color-field-item", [
                    m("label.color-label", "Background"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.bgPrimary.startsWith("#")
                        ? editingTheme.bgPrimary
                        : "#111111",
                      oninput: (e: any) => {
                        editingTheme.bgPrimary = e.target.value;
                      },
                    }),
                  ]),

                  m("div.color-field-item", [
                    m("label.color-label", "Accent Color"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.accent.startsWith("#")
                        ? editingTheme.accent
                        : "#3b82f6",
                      oninput: (e: any) => {
                        editingTheme.accent = e.target.value;
                      },
                    }),
                  ]),

                  m("div.color-field-item", [
                    m("label.color-label", "Selected Square"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.sqSelected.startsWith("#")
                        ? editingTheme.sqSelected
                        : "#eab308",
                      oninput: (e: any) => {
                        editingTheme.sqSelected = e.target.value;
                      },
                    }),
                  ]),

                  m("div.color-field-item", [
                    m("label.color-label", "Legal Move Dot"),
                    m("input.color-input", {
                      type: "color",
                      value: editingTheme.sqLegalDot.startsWith("#")
                        ? editingTheme.sqLegalDot
                        : "#000000",
                      oninput: (e: any) => {
                        editingTheme.sqLegalDot = e.target.value;
                      },
                    }),
                  ]),
                ]),

                // Save / Cancel
                m("div.minimal-modal-actions", [
                  m(
                    "button.btn-minimal-secondary",
                    {
                      onclick: () => {
                        isEditingTheme = false;
                      },
                    },
                    "Cancel",
                  ),
                  m(
                    "button.btn-minimal-primary",
                    {
                      onclick: () => {
                        if (!editingTheme.name.trim()) {
                          editingTheme.name = "Custom Theme";
                        }
                        saveCustomTheme(editingTheme);
                        saveSettings({ activeThemeId: editingTheme.id });
                        isEditingTheme = false;
                        sound.playMove();
                      },
                    },
                    "Save & Apply",
                  ),
                ]),
              ]),
            ]),
          ])
        : null,

      // Main Settings Body
      m("div.compact-setup-body", [
        // 1. Theme Selection
        m("div.setup-group", [
          m("div.group-header-row", [
            m("span.setup-label", "Themes"),
            m(
              "button.btn-text-action",
              {
                onclick: () => {
                  editingTheme = createDefaultNewTheme();
                  isEditingTheme = true;
                },
              },
              "+ Create Theme",
            ),
          ]),

          m("div.theme-cards-stack", [
            allThemes.map((theme) => {
              const isSelected = settings.activeThemeId === theme.id;
              return m(
                "div.theme-row-item",
                {
                  class: isSelected ? "selected" : "",
                  onclick: () => {
                    saveSettings({ activeThemeId: theme.id });
                    sound.playMove();
                  },
                },
                [
                  // Mini 2x2 board square swatch
                  m("div.theme-swatch-box", [
                    m("div.swatch-sq", {
                      style: { backgroundColor: theme.boardLight },
                    }),
                    m("div.swatch-sq", {
                      style: { backgroundColor: theme.boardDark },
                    }),
                    m("div.swatch-sq", {
                      style: { backgroundColor: theme.boardDark },
                    }),
                    m("div.swatch-sq", {
                      style: { backgroundColor: theme.boardLight },
                    }),
                  ]),

                  m("div.theme-row-info", [
                    m("span.theme-name-text", theme.name),
                    theme.isCustom
                      ? m("span.theme-custom-tag", "Custom")
                      : null,
                  ]),

                  // Actions for custom themes (Edit / Duplicate / Delete)
                  theme.isCustom
                    ? m("div.theme-row-actions", [
                        m(
                          "button.btn-mini-action",
                          {
                            title: "Edit Theme",
                            onclick: (e: Event) => {
                              e.stopPropagation();
                              editingTheme = { ...theme };
                              isEditingTheme = true;
                            },
                          },
                          "✎",
                        ),
                        m(
                          "button.btn-mini-action",
                          {
                            title: "Duplicate Theme",
                            onclick: (e: Event) => {
                              e.stopPropagation();
                              const copy: ChessThemePalette = {
                                ...theme,
                                id: "custom_" + Date.now(),
                                name: `${theme.name} (Copy)`,
                              };
                              saveCustomTheme(copy);
                              saveSettings({ activeThemeId: copy.id });
                            },
                          },
                          "⧉",
                        ),
                        m(
                          "button.btn-mini-action.danger",
                          {
                            title: "Delete Theme",
                            onclick: (e: Event) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${theme.name}"?`)) {
                                deleteCustomTheme(theme.id);
                              }
                            },
                          },
                          "✕",
                        ),
                      ])
                    : null,

                  isSelected ? m("span.theme-check-icon", "✓") : null,
                ],
              );
            }),
          ]),
        ]),

        // 2. Chess Piece Style
        m("div.setup-group", [
          m("div.group-header-row", [
            m("span.setup-label", "Chess Piece Style"),
          ]),

          m(
            "div.piece-styles-stack",
            Object.values(PIECE_STYLES).map((style) => {
              const isSelected = settings.pieceStyle === style.id;
              return m(
                "div.piece-style-card",
                {
                  class: isSelected ? "selected" : "",
                  onclick: () => {
                    saveSettings({ pieceStyle: style.id });
                    sound.playMove();
                  },
                },
                [
                  m("div.piece-style-preview", [
                    m("img.piece-style-img", {
                      src: getPieceImagePath(style.previewWhite, style.id),
                      alt: style.previewWhite,
                    }),
                    m("img.piece-style-img", {
                      src: getPieceImagePath(style.previewBlack, style.id),
                      alt: style.previewBlack,
                    }),
                  ]),
                  m("div.piece-style-info", [
                    m("span.piece-style-name", style.name),
                    m("span.piece-style-desc", style.description),
                  ]),
                  isSelected ? m("span.theme-check-icon", "✓") : null,
                ],
              );
            }),
          ),
        ]),

        // 3. Player Avatar (Chess.com Style)
        m("div.setup-group", [
          m("div.group-header-row", [
            m("span.setup-label", "Profile Avatar"),
          ]),
          m(
            "div.avatar-picker-grid",
            AVATAR_OPTIONS.map((opt) => {
              const isSelected = settings.userAvatar === opt.id;
              return m(
                "div.avatar-option-card",
                {
                  class: isSelected ? "selected" : "",
                  onclick: () => {
                    saveSettings({ userAvatar: opt.id });
                    sound.playMove();
                  },
                },
                [
                  m("div.avatar-option-img-wrap", [
                    m("img.avatar-picker-img", {
                      src: getAvatarImagePath(opt.id, "w"),
                      alt: opt.name,
                    }),
                    isSelected ? m("span.avatar-check-badge", "✓") : null,
                  ]),
                  m("span.avatar-option-name", opt.name),
                ],
              );
            }),
          ),
        ]),

        // 4. Preferences
        m("div.setup-group", [
          m("span.setup-label", "Preferences"),

          // Coordinates toggle
          m("div.setting-line-item", [
            m("span.setting-title-text", "Board Coordinates"),
            m("input.toggle-switch", {
              type: "checkbox",
              checked: settings.showCoordinates,
              onchange: (e: any) => {
                saveSettings({ showCoordinates: e.target.checked });
              },
            }),
          ]),

          // Animations toggle
          m("div.setting-line-item", [
            m("span.setting-title-text", "Piece Animations"),
            m("input.toggle-switch", {
              type: "checkbox",
              checked: settings.animationEnabled,
              onchange: (e: any) => {
                saveSettings({ animationEnabled: e.target.checked });
              },
            }),
          ]),

          // Sound effects
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

          // Volume slider if sounds enabled
          settings.soundEnabled
            ? m("div.volume-control-strip", [
                m("span.volume-text", "Volume"),
                m("input.minimal-slider", {
                  type: "range",
                  min: 0,
                  max: 100,
                  value: Math.round(settings.soundVolume * 100),
                  oninput: (e: any) => {
                    saveSettings({
                      soundVolume: parseInt(e.target.value) / 100,
                    });
                  },
                }),
                m(
                  "span.volume-num",
                  `${Math.round(settings.soundVolume * 100)}%`,
                ),
              ])
            : null,
        ]),
      ]),
    ]);
  },
};
