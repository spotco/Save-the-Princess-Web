# AGENTS.md — Save the Princess HTML5 / Phaser 3 Port

## Project Overview
This is a **faithful port** of the original [Save the Princess](https://github.com/spotco/Save-the-Princess) Java game to HTML5 using **Phaser 3**.

The JavaScript source is written to mirror the original Java code as closely as possible in **structure, naming conventions, class design, and style**.

**Original repo**: https://github.com/spotco/Save-the-Princess  
**Live demo**: https://spotco.github.io/Save-the-Princess-Web/

---

## Core Principles (Always Follow)

- **Fidelity first**  
  Preserve the original gameplay feel, mechanics, and visual/audio style.

- **Java-mirroring style**  
  Keep the JS code intentionally Java-like (descriptive class/variable/method names, structure, etc.).  
  Do **not** modernize or refactor into idiomatic modern JS unless explicitly asked.

- **Simplicity**  
  No build step, no bundlers, no dependencies beyond Phaser 3 (loaded via CDN).

---

## Tech Stack

- **Phaser 3** (via CDN)
- Vanilla **JavaScript** (ES modules)

### Assets
- `img/` — Sprites and art assets (ported from `art/` in the original)
- `snd/` — Audio files (copied from `snd/` in the original)
- `data/` — Level map files (TMX format, copied from `data/` in the original)

### Original source reference
The original Java source lives at `E:/dev/Save-the-Princess/src/`.  
Always refer to it when porting logic.

---

## How to Run

```bash
# Python (recommended)
python -m http.server 8000
# Then open: http://localhost:8000
```

**Alternatives:** VS Code Live Server, `npx serve .`

> **Important:** Phaser ES modules do **not** work via `file://`. Always use a local server.

---

## File Structure

```
Save-the-Princess-Web/
├── index.html          # Entry point — loads Phaser and Main.js
├── src/                # JavaScript source (mirrors Java src structure)
│   ├── Main.js         # Boot / scene config (mirrors STPGame.java)
│   ├── STPView.js      # Main game scene
│   ├── Menu.js
│   ├── AnimationManager.js
│   ├── SoundManager.js
│   ├── TimerCounter.js
│   ├── ListContainer.js
│   ├── SaveReader.js
│   ├── Player.js
│   ├── levels/
│   ├── enemy/
│   ├── other/
│   └── Animations/
├── img/                # Sprites / art assets
├── snd/                # Sound files
├── data/               # Level TMX files
├── AGENTS.md           # This file
└── PLAN.md             # Development plan and progress tracking
```

---

## Original Java Source → JS Mapping

| Original Java file | JS equivalent | Notes |
|---|---|---|
| `save_the_princess/STPGame.java` | `src/Main.js` | Boot, config, scene management |
| `save_the_princess/STPView.java` | `src/STPView.js` | Main game scene / render loop |
| `save_the_princess/Menu.java` | `src/Menu.js` | Title / menu screen |
| `save_the_princess/AnimationManager.java` | `src/AnimationManager.js` | Sprite animation management |
| `save_the_princess/SoundManager.java` | `src/SoundManager.js` | Audio |
| `save_the_princess/TimerCounter.java` | `src/TimerCounter.js` | Timer utilities |
| `save_the_princess/ListContainer.java` | `src/ListContainer.js` | Generic list helper |
| `save_the_princess/SaveReader.java` | `src/SaveReader.js` | Save/load (localStorage) |
| `levels/Level.java` + `Level1-6.java` | `src/levels/Level.js` etc. | Level definitions |
| `Player/Player.java` | `src/Player.js` | Player character |
| `enemy/Enemy.java` | `src/enemy/Enemy.js` | Enemy base class |
| `enemy/Guard.java` | `src/enemy/Guard.js` | Guard enemy |
| `enemy/Dog.java` | `src/enemy/Dog.js` | Dog enemy |
| `enemy/Wizard.java` | `src/enemy/Wizard.js` | Wizard enemy |
| `enemy/Fireball.java` | `src/enemy/Fireball.js` | Fireball projectile |
| `enemy/KnightBoss.java` | `src/enemy/KnightBoss.js` | Boss enemy |
| `other/` (Door, Key, Crate, etc.) | `src/other/` | Interactive objects |
| `Animations/` | `src/Animations/` | Cutscene / special animations |

---

## Coding Guidelines

- Mirror the original Java structure and naming wherever possible
- Use clear, descriptive variable and method names (Java style)
- Keep comments helpful when porting or modifying logic
- Prefer performance-friendly Phaser patterns
- Do **not** introduce new dependencies
- Do **not** change the no-build workflow
- Save/load state via `localStorage` (replaces original file-based `save.dat`)

---

## Development Workflow

1. Read `PLAN.md` before starting any non-trivial task — it tracks current phase, priorities, and remaining work.
2. Create a clear, numbered plan before writing code.
3. Work on one task at a time.
4. After finishing a task (or at the end of a session), update `PLAN.md`:
   - Mark completed items with `[x]`
   - Move or adjust remaining TODOs as needed
   - Update "Current Phase" and "Next Milestone"

Use checkbox format `[ ]` / `[x]` in `PLAN.md` for tracking.

---

## When Making Changes

- Always reference the corresponding original Java file for logic fidelity
- Test using a local server — Phaser ES modules do **not** work via `file://`
- Maintain the goal: **"Feels like the original Java version"**
