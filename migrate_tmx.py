#!/usr/bin/env python3
"""
migrate_tmx.py — one-time migration: TMX level files → .stplevel.json

Run from the project root:
    python migrate_tmx.py

Output: data/stplevels/level1.stplevel.json  … level6.stplevel.json
"""

import base64
import json
import struct
import sys
import zlib
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / 'data'
IMG  = ROOT / 'img'
OUT  = ROOT / 'data' / 'stplevels'

TILEMAP_NAMES = {'tileset1', 'guard1set', 'wizard1set'}

def tilemap_image_key(name):
    return (name + '_tilemap') if name in TILEMAP_NAMES else name

def parse_tsx(tsx_path):
    """Return (name, image_key, tile_elements) for an external .tsx file."""
    root = ET.parse(tsx_path).getroot()
    name    = root.attrib.get('name', Path(tsx_path).stem)
    img_el  = root.find('image')
    img_src = img_el.attrib.get('source', '') if img_el is not None else ''
    img_key = tilemap_image_key(Path(img_src).stem)
    return name, img_key, root.findall('tile')

def parse_tileset_el(ts_el, img_dir):
    """
    Parse one <tileset> element (inline or external TSX reference).
    Returns { name, firstgid, imageKey }.
    """
    firstgid = int(ts_el.attrib.get('firstgid', '1'))
    source   = ts_el.attrib.get('source', '')

    if source:
        tsx_path        = img_dir / Path(source).name
        name, img_key, tile_els = parse_tsx(tsx_path)
    else:
        name     = ts_el.attrib.get('name', '')
        img_el   = ts_el.find('image')
        img_src  = img_el.attrib.get('source', '') if img_el is not None else ''
        img_key  = tilemap_image_key(Path(img_src).stem)
    return dict(name=name, firstgid=firstgid, imageKey=img_key)

def decode_base64_gzip(b64_text):
    """Decode base64+gzip tile data → flat list of uint32 GIDs."""
    raw  = base64.b64decode(b64_text.strip())
    data = zlib.decompress(raw, wbits=zlib.MAX_WBITS | 16)   # 16 = gzip mode
    n    = len(data) // 4
    return list(struct.unpack_from(f'<{n}I', data))

def parse_tmx(tmx_path):
    """Parse one TMX file. Returns screen dict ready for .stplevel.json."""
    root   = ET.parse(tmx_path).getroot()
    width  = int(root.attrib['width'])
    height = int(root.attrib['height'])

    tilesets_out  = []

    for ts_el in root.findall('tileset'):
        ts = parse_tileset_el(ts_el, IMG)
        tilesets_out.append({'name': ts['name'], 'firstgid': ts['firstgid']})

    data_el = root.find('.//layer/data')
    tiles   = decode_base64_gzip(data_el.text)

    return dict(width=width, height=height, tilesets=tilesets_out, tiles=tiles)

# ---------------------------------------------------------------------------
# Level definitions
# ---------------------------------------------------------------------------

LEVELS = [
    dict(
        name='why are there so many dogs',
        output='level1.stplevel.json',
        mapsong='main1', screensX=1, screensY=1, spawnScreen=[0, 0],
        tmx={(0, 0): 'level1.tmx'},
    ),
    dict(
        name='buttons and doors',
        output='level2.stplevel.json',
        mapsong='main1', screensX=1, screensY=1, spawnScreen=[0, 0],
        tmx={(0, 0): 'level2.tmx'},
    ),
    dict(
        name='your friendly introduction to crates',
        output='level3.stplevel.json',
        mapsong='main1', screensX=1, screensY=1, spawnScreen=[0, 0],
        tmx={(0, 0): 'level3.tmx'},
    ),
    dict(
        name='maximum security',
        output='level4.stplevel.json',
        mapsong='main1', screensX=2, screensY=2, spawnScreen=[0, 0],
        tmx={
            (0, 0): 'level4(0-0).tmx',
            (1, 0): 'level4(1-0).tmx',
            (0, 1): 'level4(0-1).tmx',
            (1, 1): 'level4(1-1).tmx',
        },
    ),
    dict(
        name='are u a wizard',
        output='level5.stplevel.json',
        mapsong='main1', screensX=1, screensY=3, spawnScreen=[0, 0],
        tmx={
            (0, 0): 'level5(0-0).tmx',
            (0, 1): 'level5(0-1).tmx',
            (0, 2): 'level5(0-2).tmx',
        },
    ),
    dict(
        name='1v1 me bicth anytiem',
        output='level6.stplevel.json',
        mapsong='main1', screensX=2, screensY=2, spawnScreen=[0, 0],
        tmx={
            (0, 0): 'level6(0-0).tmx',
            (1, 0): 'level6(1-0).tmx',
            (0, 1): 'level6(0-1).tmx',
            (1, 1): 'level6(1-1).tmx',
        },
    ),
]

# ---------------------------------------------------------------------------

def migrate(level_def):
    screens = []
    for (sx, sy), tmx_filename in level_def['tmx'].items():
        sd = parse_tmx(DATA / tmx_filename)
        screens.append(dict(sx=sx, sy=sy, width=sd['width'], height=sd['height'],
                            tilesets=sd['tilesets'], tiles=sd['tiles']))
    # Consistent ordering: (sy, sx)
    screens.sort(key=lambda s: (s['sy'], s['sx']))
    return dict(format='stplevel', version=1,
                name=level_def['name'], mapsong=level_def['mapsong'],
                screensX=level_def['screensX'], screensY=level_def['screensY'],
                spawnScreen=level_def['spawnScreen'], screens=screens)

def main():
    OUT.mkdir(exist_ok=True)
    for level_def in LEVELS:
        print(f"  {level_def['output']} ...", end=' ', flush=True)
        obj      = migrate(level_def)
        out_path = OUT / level_def['output']
        with open(out_path, 'w', newline='\n') as f:
            json.dump(obj, f, indent=2)
        screen_count = len(obj['screens'])
        tile_sum     = sum(len(s['tiles']) for s in obj['screens'])
        print(f"{screen_count} screen(s), {tile_sum} total GIDs")
    print("Done.")

if __name__ == '__main__':
    main()
