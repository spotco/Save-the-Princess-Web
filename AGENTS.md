# AGENTS.md - Save the Princess HTML5 / Phaser 3 Port

## Project Overview
This is a faithful port of the original [Save the Princess](https://github.com/spotco/Save-the-Princess) Java game to HTML5 using Phaser 3.

The JavaScript source is written to mirror the original Java code as closely as possible in structure, naming conventions, class design, and style.

Original repo: https://github.com/spotco/Save-the-Princess
Live demo: https://spotco.github.io/Save-the-Princess-Web/

---

## Core Principles (Always Follow)

- Fidelity first for ported code
  Preserve the original gameplay feel, mechanics, and visual/audio style
  for everything that corresponds to the Java source.
- Java-recognizable style
  Keep the JS code intentionally Java-like (descriptive class/variable/method names, structure, etc.).
  Do not modernize or refactor into idiomatic modern JS unless explicitly asked.
- New features are allowed
  The project is past the faithful-port phase. Adding new features
  (editor, new menus, new UI, etc.) is fine. When you add new code, keep
  it structured and named so that it still *looks* like it belongs next
  to the Java-mirroring code — classes with descriptive names, explicit
  methods, no clever idiomatic-JS tricks.
- Prefer Phaser text over baked-in text images
  For new UI (and for refactors of existing menus), render labels with
  `scene.add.text()` rather than bitmap art. Lay the code out so it is
  obvious which button maps to which text — e.g., an entries array where
  each row is `{ label, action }`, not a lookup by numeric index spread
  across multiple methods.
- Simplicity
  No build step, no bundlers, no dependencies beyond Phaser 3 (loaded via CDN).

---

## Tech Stack

- Phaser 3 (via CDN)
- Vanilla JavaScript (ES modules)

### Assets
- `img/` - Sprites and art assets (ported from `art/` in the original)
- `snd/` - Audio files (copied from `snd/` in the original)
- `data/` - Level map files (TMX format, copied from `data/` in the original)

### Original source reference
The original Java source lives at `E:/dev/Save-the-Princess/src/`.
Always refer to it when porting logic.

---

## How to Run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Alternatives: VS Code Live Server, `npx serve .`

Important: Phaser ES modules do not work via `file://`. Always use a local server.

---

## File Structure

```text
Save-the-Princess-Web/
|- index.html                  # Entry point - loads Phaser and Main.js
|- src/                        # JavaScript source (mirrors Java src structure)
|  |- Main.js                  # Boot / scene config (mirrors STPGame.java)
|  |- STPView.js               # Main game scene
|  |- Menu.js
|  |- AnimationManager.js
|  |- SoundManager.js
|  |- TimerCounter.js
|  |- ListContainer.js
|  |- SaveReader.js
|  |- Player.js
|  |- levels/
|  |- enemy/
|  |- other/
|  '- Animations/
|- img/                        # Sprites / art assets
|- snd/                        # Sound files
|- data/                       # Level TMX files
|- AGENTS.md                   # This file
|- PLAN.md                     # Active development plan only
|- PLAN_COMPLETED.md           # Completed implementation notes
'- ADDITIONS_FROM_SOURCE.md    # Non-Java feature backlog
```

---

## Original Java Source -> JS Mapping

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
- Preserve local JS style exactly when editing existing files
- Before editing an existing JS file, inspect nearby methods and mirror that file's conventions rather than applying conventions from another file or from the original Java source
- This includes naming conventions, method prefixes, field prefixes, comment style, spacing/alignment patterns, and overall code shape
- Do not rename methods/properties, switch between public-looking and underscore-prefixed helpers, or otherwise "improve" style unless the file already uses that style or the task explicitly asks for it
- Behavioral fixes should be minimal and style-neutral whenever possible
- Use clear, descriptive variable and method names (Java style)
- Keep comments helpful when porting or modifying logic
- Prefer performance-friendly Phaser patterns
- Do not introduce new dependencies
- Do not change the no-build workflow
- Save/load state via `localStorage` (replaces original file-based `save.dat`)

---

## Development Workflow

1. Read `PLAN.md` before starting any non-trivial task. It tracks active work only.
2. Read `PLAN_COMPLETED.md` when you need completed phase details or prior implementation history.
3. Read `ADDITIONS_FROM_SOURCE.md` when the task involves features that were not present in the original Java source.
4. Create a clear, numbered plan before writing code.
5. Work on one task at a time.
6. After finishing a task, update the tracking docs:
   - `PLAN.md` for active and upcoming work only
   - `PLAN_COMPLETED.md` for finished implementation notes
   - `ADDITIONS_FROM_SOURCE.md` for approved non-source features

Use checkbox format `[ ]` / `[x]` in planning docs where applicable.

---

## When Making Changes

- Always reference the corresponding original Java file for logic fidelity
- Test using a local server - Phaser ES modules do not work via `file://`
- Maintain the goal: "Feels like the original Java version"
- Keep non-source additions clearly separated from the faithful port by tracking them in `ADDITIONS_FROM_SOURCE.md`
