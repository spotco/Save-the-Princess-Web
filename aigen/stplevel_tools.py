#!/usr/bin/env python3
"""Developer-only helpers for AI-assisted .stplevel.json work.

The game itself stays dependency-free; this script uses only Python stdlib.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
CATALOG_PATH = SCRIPT_DIR / "tile_catalog.json"


def load_catalog() -> dict:
    with CATALOG_PATH.open("r", encoding="utf-8") as file:
        catalog = json.load(file)

    catalog["tilesetsByName"] = {}
    for tileset in catalog["tilesets"]:
        tileset["firstgid"] = int(tileset["firstgid"])
        tileset["tileCount"] = int(tileset["tileCount"])
        catalog["tilesetsByName"][tileset["name"]] = tileset
    return catalog


def canonical_tilesets(catalog: dict) -> list[dict]:
    return [
        {"name": tileset["name"], "firstgid": tileset["firstgid"]}
        for tileset in catalog["tilesets"]
    ]


def read_level(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def gid_info(gid: int, screen: dict, catalog: dict) -> dict | None:
    if gid == 0:
        return {
            "gid": 0,
            "tileset": "empty",
            "localId": -1,
            "label": "empty",
            "symbol": " ",
            "properties": {},
        }

    for tileset_ref in screen.get("tilesets", []):
        name = tileset_ref.get("name")
        catalog_tileset = catalog["tilesetsByName"].get(name)
        if not catalog_tileset:
            continue

        firstgid = int(tileset_ref.get("firstgid", catalog_tileset["firstgid"]))
        tile_count = catalog_tileset["tileCount"]
        if firstgid <= gid < firstgid + tile_count:
            local_id = gid - firstgid
            tile = catalog_tileset["tiles"].get(str(local_id), {})
            return {
                "gid": gid,
                "tileset": name,
                "localId": local_id,
                "label": tile.get("label", f"{name} tile {local_id}"),
                "symbol": tile.get("symbol", "?"),
                "properties": tile.get("properties", {}),
            }

    return None


def iter_screen_tiles(screen: dict, catalog: dict):
    width = screen.get("width", 0)
    tiles = screen.get("tiles", [])
    for index, gid in enumerate(tiles):
        x = index % width if width else 0
        y = index // width if width else 0
        info = gid_info(gid, screen, catalog) if isinstance(gid, int) else None
        yield x, y, gid, info


def entity_counts(level: dict, catalog: dict) -> Counter:
    counts = Counter()
    for screen in level.get("screens", []):
        for _x, _y, _gid, info in iter_screen_tiles(screen, catalog):
            if not info:
                counts["unknown_gid"] += 1
                continue
            props = info["properties"]
            if props.get("wall") == "true":
                counts["wall"] += 1
            for prop_name, prop_value in props.items():
                if prop_name == "wall":
                    continue
                counts[prop_name] += 1
                counts[f"{prop_name}:{prop_value}"] += 1
    return counts


def validate_level(level: dict, catalog: dict, strict: bool = True) -> tuple[list[str], list[str]]:
    errors = []
    warnings = []

    if not isinstance(level, dict):
        return ["level root is not an object"], warnings

    if level.get("format") != "stplevel":
        errors.append('format must be "stplevel"')
    if not isinstance(level.get("version"), int):
        errors.append("version must be an integer")

    screens_x = level.get("screensX")
    screens_y = level.get("screensY")
    if not isinstance(screens_x, int) or screens_x < 1:
        errors.append("screensX must be a positive integer")
        screens_x = 0
    if not isinstance(screens_y, int) or screens_y < 1:
        errors.append("screensY must be a positive integer")
        screens_y = 0

    spawn = level.get("spawnScreen", [0, 0])
    if (
            not isinstance(spawn, list) or len(spawn) != 2 or
            not all(isinstance(value, int) for value in spawn)):
        errors.append("spawnScreen must be [sx, sy]")
    elif screens_x and screens_y:
        if not (0 <= spawn[0] < screens_x and 0 <= spawn[1] < screens_y):
            errors.append("spawnScreen is outside the screen grid")

    screens = level.get("screens")
    if not isinstance(screens, list):
        errors.append("screens must be an array")
        screens = []

    seen = set()
    expected = {(sx, sy) for sx in range(screens_x) for sy in range(screens_y)}
    canonical_names = {tileset["name"] for tileset in catalog["tilesets"]}
    player_positions = []
    goal_count = 0

    for screen in screens:
        sx = screen.get("sx")
        sy = screen.get("sy")
        label = f"screen ({sx},{sy})"

        if not isinstance(sx, int) or not isinstance(sy, int):
            errors.append(f"{label} sx/sy must be integers")
            continue
        if (sx, sy) in seen:
            errors.append(f"{label} is duplicated")
        seen.add((sx, sy))
        if screens_x and screens_y and (sx, sy) not in expected:
            errors.append(f"{label} is outside the declared screen grid")

        width = screen.get("width")
        height = screen.get("height")
        if width != catalog["screenWidth"] or height != catalog["screenHeight"]:
            message = f"{label} should be {catalog['screenWidth']}x{catalog['screenHeight']}, got {width}x{height}"
            if strict:
                errors.append(message)
            else:
                warnings.append(message)

        tiles = screen.get("tiles")
        if not isinstance(tiles, list):
            errors.append(f"{label} tiles must be an array")
            continue
        if isinstance(width, int) and isinstance(height, int) and len(tiles) != width * height:
            errors.append(f"{label} has {len(tiles)} tiles, expected {width * height}")

        tilesets = screen.get("tilesets")
        if not isinstance(tilesets, list):
            errors.append(f"{label} tilesets must be an array")
            continue

        firstgids = {}
        for tileset in tilesets:
            name = tileset.get("name")
            firstgid = tileset.get("firstgid")
            if name in firstgids:
                errors.append(f"{label} has duplicate tileset {name}")
            firstgids[name] = firstgid
            if not isinstance(firstgid, int):
                errors.append(f"{label} tileset {name} firstgid must be an integer")
            if name not in canonical_names:
                errors.append(f"{label} has unknown tileset {name}")

        for name in canonical_names:
            if name not in firstgids:
                warnings.append(f"{label} is missing canonical tileset {name}")

        for x, y, gid, info in iter_screen_tiles(screen, catalog):
            if not isinstance(gid, int):
                errors.append(f"{label} tile ({x},{y}) has non-integer gid {gid!r}")
                continue
            if gid < 0:
                errors.append(f"{label} tile ({x},{y}) has negative gid {gid}")
                continue
            if info is None:
                errors.append(f"{label} tile ({x},{y}) uses gid {gid}, outside known 5x5 tilesets")
                continue

            props = info["properties"]
            if props.get("player") == "true":
                player_positions.append((sx, sy, x, y))
            if props.get("princess") == "true" or props.get("final") == "true":
                goal_count += 1

    missing = expected - seen
    if missing:
        errors.append("missing screens: " + ", ".join(f"({sx},{sy})" for sx, sy in sorted(missing)))
    extra = seen - expected
    if extra:
        errors.append("extra screens: " + ", ".join(f"({sx},{sy})" for sx, sy in sorted(extra)))

    if len(player_positions) != 1:
        errors.append(f"expected exactly one player start, found {len(player_positions)}")
    elif isinstance(spawn, list) and len(spawn) == 2:
        psx, psy, _px, _py = player_positions[0]
        if [psx, psy] != spawn:
            warnings.append(f"player start is on screen ({psx},{psy}) but spawnScreen is {spawn}")

    if goal_count < 1:
        warnings.append("no princess or final ledge goal tile found")

    return errors, warnings


def format_counts(counts: Counter) -> str:
    keys = [
        "player", "princess", "final", "savepoint", "key", "keydoor",
        "door", "doorbutton", "exit", "guardspawn", "guardpoint",
        "dog", "wizard", "knightboss", "bossactivate", "tracker",
        "cratespawn", "wall",
    ]
    parts = [f"{key}={counts[key]}" for key in keys if counts[key]]
    return ", ".join(parts) if parts else "no semantic tiles"


def print_summary(path: Path, level: dict, catalog: dict, show_ascii: bool, screen_filter: tuple[int, int] | None):
    counts = entity_counts(level, catalog)
    print(f"{path}")
    print(f"  name: {level.get('name', '')}")
    print(f"  mapsong: {level.get('mapsong', '')}")
    print(f"  grid: {level.get('screensX')}x{level.get('screensY')} screens, spawnScreen={level.get('spawnScreen')}")
    print(f"  counts: {format_counts(counts)}")

    for screen in sorted(level.get("screens", []), key=lambda s: (s.get("sy", 0), s.get("sx", 0))):
        sx = screen.get("sx")
        sy = screen.get("sy")
        if screen_filter and (sx, sy) != screen_filter:
            continue
        screen_counts = Counter()
        for _x, _y, _gid, info in iter_screen_tiles(screen, catalog):
            if info:
                props = info["properties"]
                if props.get("wall") == "true":
                    screen_counts["wall"] += 1
                for prop_name in props:
                    if prop_name != "wall":
                        screen_counts[prop_name] += 1

        print(f"  screen ({sx},{sy}) {screen.get('width')}x{screen.get('height')}: {format_counts(screen_counts)}")
        if show_ascii:
            print_ascii_screen(screen, catalog)


def print_ascii_screen(screen: dict, catalog: dict):
    width = screen.get("width", 0)
    height = screen.get("height", 0)
    tiles = screen.get("tiles", [])
    for y in range(height):
        row = []
        for x in range(width):
            index = y * width + x
            gid = tiles[index] if index < len(tiles) else 0
            info = gid_info(gid, screen, catalog) if isinstance(gid, int) else None
            row.append(info["symbol"] if info else "?")
        print("    " + "".join(row))


def command_validate(args) -> int:
    catalog = load_catalog()
    had_errors = False
    for arg_path in args.files:
        path = Path(arg_path)
        try:
            level = read_level(path)
            errors, warnings = validate_level(level, catalog, strict=not args.loose)
        except Exception as exc:
            errors = [str(exc)]
            warnings = []

        if errors:
            had_errors = True
            print(f"{path}: FAIL")
            for error in errors:
                print(f"  error: {error}")
        else:
            print(f"{path}: OK")

        for warning in warnings:
            print(f"  warning: {warning}")

    return 1 if had_errors else 0


def parse_screen_filter(text: str | None) -> tuple[int, int] | None:
    if not text or text == "all":
        return None
    parts = text.split(",")
    if len(parts) != 2:
        raise ValueError("--screen must be 'all' or 'sx,sy'")
    return int(parts[0]), int(parts[1])


def command_summarize(args) -> int:
    catalog = load_catalog()
    screen_filter = parse_screen_filter(args.screen)
    for arg_path in args.files:
        path = Path(arg_path)
        level = read_level(path)
        print_summary(path, level, catalog, args.ascii, screen_filter)
    return 0


def command_compare(args) -> int:
    catalog = load_catalog()
    reference = read_level(Path(args.reference))
    candidate = read_level(Path(args.candidate))
    ref_counts = entity_counts(reference, catalog)
    cand_counts = entity_counts(candidate, catalog)
    keys = sorted(set(ref_counts.keys()) | set(cand_counts.keys()))

    print(f"reference: {args.reference}")
    print(f"candidate: {args.candidate}")
    print(f"screen grid: {reference.get('screensX')}x{reference.get('screensY')} -> {candidate.get('screensX')}x{candidate.get('screensY')}")
    for key in keys:
        if ":" in key:
            continue
        ref_value = ref_counts[key]
        cand_value = cand_counts[key]
        if ref_value != cand_value:
            delta = cand_value - ref_value
            sign = "+" if delta > 0 else ""
            print(f"  {key}: {ref_value} -> {cand_value} ({sign}{delta})")
    return 0


def blank_screen(sx: int, sy: int, catalog: dict, border: bool) -> dict:
    width = catalog["screenWidth"]
    height = catalog["screenHeight"]
    tiles = [0] * (width * height)
    if border:
        wall_gid = 1
        for x in range(width):
            tiles[x] = wall_gid
            tiles[(height - 1) * width + x] = wall_gid
        for y in range(height):
            tiles[y * width] = wall_gid
            tiles[y * width + width - 1] = wall_gid
    return {
        "sx": sx,
        "sy": sy,
        "width": width,
        "height": height,
        "tilesets": canonical_tilesets(catalog),
        "tiles": tiles,
    }


def command_new(args) -> int:
    catalog = load_catalog()
    if not (0 <= args.spawn_sx < args.screens_x and 0 <= args.spawn_sy < args.screens_y):
        print("error: spawn screen is outside the declared screen grid", file=sys.stderr)
        return 1
    if not (0 <= args.player_x < catalog["screenWidth"] and 0 <= args.player_y < catalog["screenHeight"]):
        print("error: player position is outside a 25x25 screen", file=sys.stderr)
        return 1

    screens = []
    for sx in range(args.screens_x):
        for sy in range(args.screens_y):
            screens.append(blank_screen(sx, sy, catalog, args.border))

    level = {
        "format": "stplevel",
        "version": 1,
        "name": args.name,
        "mapsong": args.mapsong,
        "screensX": args.screens_x,
        "screensY": args.screens_y,
        "spawnScreen": [args.spawn_sx, args.spawn_sy],
        "screens": screens,
    }

    spawn_screen = next(
        screen for screen in screens
        if screen["sx"] == args.spawn_sx and screen["sy"] == args.spawn_sy
    )
    spawn_screen["tiles"][args.player_y * catalog["screenWidth"] + args.player_x] = 21

    errors, warnings = validate_level(level, catalog)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as file:
        json.dump(level, file, indent=2)
        file.write("\n")

    print(f"wrote {out_path}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Helpers for .stplevel.json AI generation.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="validate .stplevel.json files")
    validate_parser.add_argument("files", nargs="+")
    validate_parser.add_argument("--loose", action="store_true", help="warn instead of failing on non-25x25 screens")
    validate_parser.set_defaults(func=command_validate)

    summarize_parser = subparsers.add_parser("summarize", help="summarize semantic tile usage")
    summarize_parser.add_argument("files", nargs="+")
    summarize_parser.add_argument("--ascii", action="store_true", help="print ASCII maps")
    summarize_parser.add_argument("--screen", default="all", help="screen filter as all or sx,sy")
    summarize_parser.set_defaults(func=command_summarize)

    compare_parser = subparsers.add_parser("compare", help="compare semantic counts between two levels")
    compare_parser.add_argument("reference")
    compare_parser.add_argument("candidate")
    compare_parser.set_defaults(func=command_compare)

    new_parser = subparsers.add_parser("new", help="create a blank level scaffold")
    new_parser.add_argument("output")
    new_parser.add_argument("--name", default="ai generated level")
    new_parser.add_argument("--mapsong", default="main1")
    new_parser.add_argument("--screens-x", type=int, default=1)
    new_parser.add_argument("--screens-y", type=int, default=1)
    new_parser.add_argument("--spawn-sx", type=int, default=0)
    new_parser.add_argument("--spawn-sy", type=int, default=0)
    new_parser.add_argument("--player-x", type=int, default=12)
    new_parser.add_argument("--player-y", type=int, default=12)
    new_parser.add_argument("--border", action="store_true")
    new_parser.set_defaults(func=command_new)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
