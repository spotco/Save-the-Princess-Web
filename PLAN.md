# Save the Princess - Active Development Plan

**Last Updated**: 2026-04-12

---

## Active Focus

The Java-faithful port implementation phases are complete.

Use this file only for active and upcoming work.

For completed implementation details, see `PLAN_COMPLETED.md`.
For features that are intentionally outside the original Java source, see `ADDITIONS_FROM_SOURCE.md`.

---

## Current Phase

Maintenance / follow-up work only. No active port phase is in progress.

## Next Milestone

Decide and scope the first post-port addition from `ADDITIONS_FROM_SOURCE.md`.

---

## Active TODOs

- [ ] Review and prioritize items in `ADDITIONS_FROM_SOURCE.md`
- [ ] Add new active work here only when it is approved to start

---

## Known Notes (read before editing)

1. **Startup/menu flow now matches Java.** Fresh boot enters `TitleScreenAnimation`, returns to the static title menu, and only then does SPACE/ENTER advance to the loader.
2. **GameScene scene data remains the level handoff path.** `Menu._loadGame()` calls `this.scene.scene.start('GameScene', { levelName })`. `GameScene` receives the level name via `this.scene.settings.data.levelName` in `create()`.

---

## Key Implementation Notes

- **Tile size**: 25x25 pixels everywhere (grid unit)
- **Game canvas**: 625x625 (25 tiles x 25 tiles per screen)
- **Coordinate system**: top-left origin; hitboxes specified as `{x, y, width, height}`
- **Player hitbox**: 15x15, offset 10px down from sprite top-left
- **Animation timing**: original uses Slick ms durations; port uses frame counters (decrement each `update()`)
- **Entity removal**: always iterate a copy of lists when enemies/objects may remove themselves
- **Multi-screen levels**: `locationX/locationY` index into `level.masterList[x][y]`; Exit objects trigger `changeloc()`
- **Pathfinding (KnightBoss)**: breadcrumb heatmap via Tracker; no A* needed
- **Audio**: Phaser `scene.sound.add()` for music loop; `play()` for SFX

---

**Instructions for all agents**:
Always check this file before starting work. Keep `PLAN.md` focused on active work only. Record completed implementation details in `PLAN_COMPLETED.md`, and record non-source feature ideas in `ADDITIONS_FROM_SOURCE.md`.
