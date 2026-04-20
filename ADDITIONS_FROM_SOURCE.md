# Additions From Source

**Last Updated**: 2026-04-19

---

This file tracks features that are not part of the original Java game and should be treated as deliberate additions to the port.

Only add items here when they are outside the original source behavior or feature set.

---

## Proposed Additions

- [~] Tile map level editor and save to file *(in progress — see `PLAN.md`)*
- [~] Load level from file *(in progress — bundled with the editor feature)*
- [~] Main menu with additional options *(in progress — scrollable list menu, all labels rendered as Phaser text instead of baked-in images, hosts the Level Editor entry; see `PLAN.md`)*
- [~] Migrate default Level 1–6 data from TMX to `.stplevel.json` *(in progress — runtime reads the new JSON files; TMX kept only as historical reference; see `PLAN.md`)*
- [ ] Save point feature
- [ ] Sprint button
- [~] Touch screen / mouse controls *(in progress — Phase 1.5 for menus, Phase 3 for editor, Phase 6.5 for in-game virtual D-pad; see `PLAN.md`)*
- [x] Show the in-game `seeme` / where-am-I prompt after 3 seconds with no player movement at level start, and after 20 seconds without player movement once movement has been observed in that level.
- [x] Use one shared mouse/touch pointer placement path for the virtual D-pad so it appears at the input location while staying fully onscreen.
- [x] Scale the fixed 625x625 Phaser canvas to fit smaller browser viewports without page scrollbars.
- [ ] Investigate how save files work
- [ ] Try AI gen some levels
