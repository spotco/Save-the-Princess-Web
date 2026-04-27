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
5. Style wall tiles with the wall-shaping rules below before saving the final
   candidate. Do not leave every wall as one flat generic GID.
6. Validate before trying it in the editor:

   ```bash
   python aigen/stplevel_tools.py validate aigen/work/candidate.stplevel.json
   ```

7. Compare against the reference if the new level should preserve similar
   pressure or density:

   ```bash
   python aigen/stplevel_tools.py compare reference.stplevel.json candidate.stplevel.json
   ```

8. Load the candidate in the in-game level editor and playtest it through the
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

## Level Design Findings

The best generated Level 1-style drafts came from designing progression first,
then decorating and tuning. Avoid starting from a random open maze or a simple
transformation of an existing level.

Good Level 1-style structure:

- Use a clear room chain: start room, first lesson room, middle pressure room,
  checkpoint room, final approach, and princess room.
- Every carved room should matter. The shortest route from the player to the
  princess should enter every intended room, unless the design explicitly calls
  for an optional reward or secret.
- Keep rooms distinct. Use narrow one- or two-tile connectors and empty void
  between room clusters so the map reads as a castle layout, not one giant
  connected floor.
- Put save points at natural checkpoints after a challenge, not inside the
  active threat area of that challenge.
- Preserve Level 1's ingredient language for Level 1-like requests: dogs,
  save points, princess, walls, torches/windows, and no doors/guards/wizards
  unless the user asks for later-level mechanics.

Dog placement:

- Dogs should face along the intended player approach lane or across a room the
  player must cross. Do not scatter dogs with arbitrary facing.
- Pair dogs only when the player has room to read and respond. Early rooms
  should teach one sightline at a time; later rooms can use crossfire.
- Avoid pointing a dog directly at a save point. This can cause an immediate
  death loop after respawn.
- A useful safety check is: for each dog, trace from the dog in its facing
  direction until a wall/torch/window wall is hit. No save point may appear on
  that trace.

Progression checks worth running before playtest:

- Exactly one player start and one normal goal for a Level 1-like map.
- The player can reach the princess through passable tiles when enemy movement
  is ignored.
- The shortest passable route enters every intended room.
- No save point is in any dog's direct sightline.
- Entity counts should stay close to the reference unless changing difficulty
  deliberately. For Level 1-like maps, `1` player, `1` princess, roughly `5`
  save points, and roughly `15` dogs felt close to the source.

## Wall Style

The original levels do not use one generic wall tile everywhere. A visually
correct generated level should first design walls as a logical solid/empty mask,
then convert each logical wall cell into the shaped `tileset1` wall GID that
matches its neighbors.

Avoid filling every wall with `gid 1`. That tile is the flat dark filler block
and makes generated levels look wrong. With the default tileset ordering
(`tileset1` firstgid `1`, `guard1set` firstgid `26`), Level 1-style walls
mostly use these GIDs:

- `2`, `3`, `6`, `7` - corner and cap pieces with diagonal cuts
- `15` - left/vertical side strip
- `19` - horizontal wall run
- `18`, `22`, `24` - alternate side/cap pieces used by some neighbor shapes
- `10` - torch wall accent from `tileset1`
- `38` - window wall accent from `guard1set` local ID `12`

The open-path tile in Level 1 is usually `gid 16`, not `gid 1`.

Because `.stplevel.json` stores GIDs, always compute the final GID from the
screen's actual tileset entry: `gid = firstgid + localId`. For new levels using
the default ordering, `tileset1` starts at `1`, so `tileset1` local ID `18`
becomes `gid 19`.

Recommended wall-generation pass:

1. Build or sketch the level with a logical grid: wall, empty/floor, player,
   princess, save point, dogs, and other objects.
2. For every logical wall cell, compute an 8-neighbor mask using north, east,
   south, west, northeast, southeast, southwest, northwest. Neighboring wall,
   torch wall, and window wall cells all count as wall.
3. Learn a `mask -> wall gid` table from bundled reference levels, especially
   `data/stplevels/level1.stplevel.json` and `level2.stplevel.json`. Count which
   wall GID appears most often for each mask.
4. When styling a new level, use the exact mask match if available. If not,
   fall back to the most common 4-neighbor `NESW` match. If that is also unseen,
   fall back to a common shaped wall tile such as `gid 15` for vertical wall
   sides or `gid 19` for horizontal runs, depending on the local shape.
5. Place torches and windows after the shape pass, replacing only cells that are
   still logical walls. Keep them sparse, like the source levels.

Practical rule of thumb: if the rendered preview shows large areas of flat grey
or dark square blocks, the wall pass failed or used `gid 1` too often. The
preview should show diagonal corner cuts, clean horizontal caps, and vertical
side strips similar to the shipped levels.

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
