# Delta Chat Chess [![CI](https://github.com/Amin-naghdbishi/deltachatchess/actions/workflows/ci.yml/badge.svg)](https://github.com/Amin-naghdbishi/deltachatchess/actions/workflows/ci.yml)

A modern, feature-packed WebXDC chess game for [Delta Chat](https://delta.chat). Play online in chat groups or offline face-to-face, with full spectator support.

[📥 **Download Latest `app.xdc`**](https://github.com/Amin-naghdbishi/deltachatchess/releases/latest/download/app.xdc)

---

## 📸 Screenshots

|             Main Game & Avatars              |             Home Screen              |
| :------------------------------------------: | :----------------------------------: |
| ![Main Game Board](screenshots/gameplay.png) | ![Home Screen](screenshots/home.png) |

|        Themes & Customization         |             Offline / Play in Person              |
| :-----------------------------------: | :-----------------------------------------------: |
| ![Settings](screenshots/settings.png) | ![Play in Person](screenshots/play-in-person.png) |

---

## ✨ Features

- **Online Multiplayer**: Play in Delta Chat groups with live updates and spectator support.
- **Play in Person (Offline)**: Play face-to-face on the same screen without needing an internet connection.
- **Chess.com-Style Experience**:
  - Selectable player avatars (King, Knight, Queen, Bot, Cat, etc.).
  - Stacked captured pieces preventing board clutter.
  - Live material score advantage indicator (`+1`, `+3`, etc.).
- **Themes & Piece Styles**:
  - Multiple piece styles including Staunton, Merida, Alpha, Modern, and Standard.
  - Built-in board themes and a custom theme editor.
- **Sound Effects**: Audio cues for moves, captures, checks, castling, and promotions.
- **Move History & Review**: Replay and step through past moves at any time.

---

## 🚀 Getting Started

### Installation

1. Download the latest `app.xdc` from [Releases](https://github.com/Amin-naghdbishi/deltachatchess/releases).
2. Send the `.xdc` file into any Delta Chat conversation to start playing.

### Development

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm start

# Run type check and linter
pnpm check

# Build the WebXDC app
pnpm build
```

The compiled file is generated in `dist-xdc/app.xdc`.

---

## 📦 Releasing

Push a version tag to trigger the automatic GitHub Actions release workflow:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 📜 Credits & License

- Chess pieces inspired by [Cburnett](https://en.wikipedia.org/wiki/User:Cburnett) ([CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.en)).
- Powered by [chess.js](https://github.com/jhlywa/chess.js) and [Mithril.js](https://mithril.js.org/).
- Licensed under the [MIT License](LICENSE).
