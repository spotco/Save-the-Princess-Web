# Save the Princess - Active Development Plan

**Last Updated**: 2026-04-25

---

## Active Focus

No active implementation phase is currently tracked here.

The save point feature was completed on 2026-04-25 and moved to
`PLAN_COMPLETED.md`. Non-source feature tracking was updated in
`ADDITIONS_FROM_SOURCE.md`.

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
