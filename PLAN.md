# Save the Princess - Active Development Plan

**Last Updated**: 2026-04-19

---

## Active Focus

No active implementation phase is currently tracked here.

The completed editor, custom-level, menu/input, and JSON-format work that had
been living in this file was migrated to `PLAN_COMPLETED.md` on 2026-04-19 so
`PLAN.md` can go back to tracking active and upcoming work only.

---

## Current Notes

1. `.stplevel.json` no longer stores `tileProps`. Runtime/editor load rebuild
   canonical tile properties from each screen's `tilesets`.
2. Editor sessions persist across title/menu exits and editor-play round trips
   until explicitly replaced by `New`, `Load`, `Import`, or a full page reload.
3. The Java-faithful port itself is complete. New work should keep the existing
   Java-recognizable structure and style.

---

**Instructions for all agents**:
Always check this file before starting work. Keep `PLAN.md` focused on active
work only. Record completed implementation details in `PLAN_COMPLETED.md`, and
record non-source feature ideas in `ADDITIONS_FROM_SOURCE.md`.
