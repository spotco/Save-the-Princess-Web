# Additions From Source

**Last Updated**: 2026-04-27

---

This file tracks features that are not part of the original Java game and should be treated as deliberate additions to the port.

Only add items here when they are outside the original source behavior or feature set.

---

## Completed Additions

- [x] Tile map level editor with paint/erase/fill/rect/picker tools, screen tabs, grid resize, undo/redo, default-level import, file load/save, and custom-level play mode.
- [x] Main menu additions and refactor: scrollable list-driven loader, all labels rendered with Phaser text, and a `LEVEL EDITOR` entry.
- [x] Touch screen / mouse support across the menu, gameplay, and editor, including the in-game virtual D-pad.
- [x] In-game pause menu with campaign/editor-aware Exit behavior.
- [x] Migrate default Level 1–6 data from TMX to `.stplevel.json`; TMX remains in the repo as historical reference only.
- [x] Store only tiles/tilesets in `.stplevel.json`; rebuild canonical `tileProps` on load for bundled levels and editor-imported/exported levels.
- [x] Persist the editor session across title/menu exits and editor-play round trips, including current screen, selected tool, palette selection/scroll, pointer-label visibility, and undo/redo state.
- [x] Preserve editor-play custom level data across death/crush resets, win/final exits, pause-menu returns, and debug skip paths.
- [x] Show the in-game `seeme` / where-am-I prompt after 3 seconds with no player movement at level start, and after 20 seconds without player movement once movement has been observed in that level.
- [x] Use one shared mouse/touch pointer placement path for the virtual D-pad so it appears at the input location while staying fully onscreen.
- [x] Scale the fixed 625x625 Phaser canvas to fit smaller browser viewports without page scrollbars.
- [x] Add an editor-only pointer-marker overlay toggle using the historical pointer-marked tileset art.
- [x] Add default-level load flow and console debug commands for editor/custom-level work.
- [x] Investigate how save files work.
- [x] Save point feature: `tileset1` bottom-right tile is now an `SV` editor tile and runtime checkpoint object. First touch activates a dim blue diamond and captures a full in-memory level snapshot; enemy/crush deaths restore that snapshot, while pause-menu Reset still restarts the level from its original state.
- [x] Editor-play final ledge exits now return directly to the editor session instead of continuing into the campaign credits.
- [x] Times screen now renders level labels and best-time columns with Phaser text, including player best times, developer best times, `none` for unfinished levels, and green player times that beat developer records.
- [x] Added fixed bottom-right controls text that switches movement help between keyboard/WASD and virtual joypad modes.
- [x] Virtual joypad can appear anywhere in the browser viewport instead of being constrained to the Phaser canvas.
- [x] Virtual joypad uses a 9-button grid with cardinal directions, diagonals that press both matching directions, and a center neutral/none button.
- [x] Off-canvas pointer input during gameplay can activate the virtual joypad; canvas input continues through Phaser's normal pointer path.
- [x] Pause menu selection accepts Space as well as Enter.
- [x] Added dev-only AI level generation helpers under `aigen/`: a canonical tile catalog, `.stplevel.json` validation/summary/comparison/scaffold tooling, and usage notes for future generated-level work.

## Human bugs (agents ignore for now)

## Proposed Additions

- [ ] Try AI gen some levels
- [ ] Try 3D rendered branch
