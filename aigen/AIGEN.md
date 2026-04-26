# AI Level Generation Helpers

This folder contains dev-only helpers for future AI-assisted `.stplevel.json`
level design. Nothing here is loaded by the Phaser game, and the project still
has no build step or runtime dependencies beyond Phaser.

## Files

- `tile_catalog.json` - canonical tile reference for the three 5x5 game
  tilesets. It records the default `firstgid`, local tile IDs, behavior
  properties, plain-English labels, and one-character ASCII symbols.
- `stplevel_tools.py` - Python stdlib command-line helpers for validating,
  summarizing, comparing, and scaffolding `.stplevel.json` files.
- `work/` - scratch area for generated candidates, temporary references, and
  intermediate drafts.

## Useful Commands

Run these from the repo root.

```bash
python aigen/stplevel_tools.py validate data/stplevels/level1.stplevel.json
python aigen/stplevel_tools.py validate data/stplevels/*.stplevel.json
python aigen/stplevel_tools.py summarize data/stplevels/level1.stplevel.json
python aigen/stplevel_tools.py summarize data/stplevels/level1.stplevel.json --ascii
python aigen/stplevel_tools.py summarize data/stplevels/level4.stplevel.json --ascii --screen 1,0
python aigen/stplevel_tools.py compare data/stplevels/level2.stplevel.json aigen/work/new_level.stplevel.json
python aigen/stplevel_tools.py new aigen/work/blank.stplevel.json --name "draft level" --border
```

PowerShell expands the bundled-level wildcard in normal use. If a shell does
not expand it, pass the level paths explicitly.

The `new` scaffold command intentionally creates only a player start and
optional border walls, so it warns about the missing goal until a princess or
final ledge is added.

## Future AI Workflow

1. Put any reference `.stplevel.json` files somewhere readable, usually
   `data/stplevels/` or `aigen/work/`.
2. Summarize references before designing:

   ```bash
   python aigen/stplevel_tools.py summarize data/stplevels/level3.stplevel.json --ascii
   ```

3. Use `tile_catalog.json` for local tile IDs. The formula is
   `gid = screen.tilesets[name].firstgid + localId`. New scaffolds use the
   default firstgid values, but bundled reference screens may reorder them.
4. Create a candidate level as `.stplevel.json`. Keep screens 25x25 with
   row-major `tiles[y * width + x]` arrays.
5. Validate before trying it in the editor:

   ```bash
   python aigen/stplevel_tools.py validate aigen/work/candidate.stplevel.json
   ```

6. Compare against the reference if the new level should preserve similar
   pressure or density:

   ```bash
   python aigen/stplevel_tools.py compare reference.stplevel.json candidate.stplevel.json
   ```

7. Load the candidate in the in-game level editor and playtest it through the
   normal local server flow:

   ```bash
   python -m http.server 8000
   ```

## Design Notes

- The portable file format stores `tiles` and `tilesets`; it does not store
  `tileProps`. Runtime/editor code rebuilds canonical properties from the
  tileset names and `firstgid` values.
- Canonical screen size is 25x25 tiles, matching the fixed 625x625 canvas and
  25px tiles.
- A valid generated level should normally have exactly one player-start tile,
  and that tile should be on `spawnScreen`.
- A playable level needs a goal: a princess tile for normal levels, or final
  ledge tiles for the end sequence.
- Validation is structural. It catches malformed files, missing screens,
  unknown GIDs, bad dimensions, and missing player starts, but it cannot prove
  that a level is solvable. Use the editor play mode for that.

## ASCII Symbol Key

- ` ` empty
- `.` passable decorative floor
- `#` wall
- `@` player start
- `P` princess
- `F` final ledge
- `S` save point
- `K` key
- `X` key door
- `D` closed door
- `O` open door
- `B` door button
- `>` `<` `^` `v` exits
- `G` guard spawn
- `+` guard path
- `*` guard stop path
- `d` dog
- `Z` wizard
- `N` knight boss
- `A` boss activation trigger
- `n` boss spawn trigger
- `t` boss tracker
- `C` crate spawn
- `T` torch wall
- `W` window wall
