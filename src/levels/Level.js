// Level.js — base level class
// Mirrors Level.java

import ListContainer             from '../ListContainer.js';
import Dog                       from '../enemy/Dog.js';
import Guard                     from '../enemy/Guard.js';
import Wizard                    from '../enemy/Wizard.js';
import KnightBoss                from '../enemy/KnightBoss.js';
import Door                      from '../other/Door.js';
import DoorButton                from '../other/DoorButton.js';
import Key                       from '../other/Key.js';
import KeyDoor                   from '../other/KeyDoor.js';
import Exit                      from '../other/Exit.js';
import GuardPath                 from '../other/GuardPath.js';
import Crate                     from '../other/Crate.js';
import Princess                  from '../other/Princess.js';
import Torch                     from '../other/Torch.js';
import Window                    from '../other/Window.js';
import Tracker                   from '../other/Tracker.js';
import KnightBossInitialActivate from '../other/KnightBossInitialActivate.js';
import KnightBossSpawn           from '../other/KnightBossSpawn.js';
import FinalCutscene             from '../other/FinalCutscene.js';

export default class Level {

    constructor(scene) {
        this.scene      = scene;
        this.storedmap  = null;   // [x][y] → parsed map data object
        this.masterList = null;   // [x][y] → ListContainer
        this.mapsong    = 'main1';
        this.locationx  = 0;
        this.locationy  = 0;
        this.playerSpawnX = 0;
        this.playerSpawnY = 0;
    }

    // Override in subclasses
    name() { return null; }

    // --- Initialization ---

    // async: loads and parses all TMX files into this.storedmap.
    // Subclasses override init() to call _parseTMXInto(cacheKey, x, y) for each screen,
    // then set this.mapsong and this.locationx/y.
    async init() {}

    // Creates this.masterList[sx][sy] by calling createStatics/Enemies/Objects
    // for every screen cell. Mirrors Level.createmasterlist(sx, sy).
    createMasterList(sx = 1, sy = 1) {
        this.masterList = [];
        for (let i = 0; i < sx; i++) {
            this.masterList[i] = [];
            for (let j = 0; j < sy; j++) {
                const lc = new ListContainer();
                lc.staticslist = this.createStatics(i, j);
                lc.enemylist   = this.createEnemies(i, j);
                lc.objectlist  = this.createObjects(i, j);
                this.masterList[i][j] = lc;
            }
        }
        this.locationx = 0;
        this.locationy = 0;
    }

    getActiveList(x, y) {
        return this.masterList[x][y];
    }

    // Returns player spawn {x, y} by scanning storedmap[mapX][mapY] for the "player" tile.
    // Mirrors Level.createplayer().
    createPlayer(mapX = 0, mapY = 0) {
        const map = this.storedmap[mapX][mapY];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (this._tileProp(mapX, mapY, x, y, 'player') === 'true') {
                    this.playerSpawnX = x * 25;
                    this.playerSpawnY = y * 25;
                    return { x: x * 25, y: y * 25 };
                }
            }
        }
        return { x: 0, y: 0 };
    }

    // --- Statics, enemies, objects ---
    // All mirror the equivalent Java methods in Level.java.

    // Mirrors Level.createstatics(): collect all tiles with property wall=true.
    createStatics(mapX, mapY) {
        const stolist = [];
        const map = this.storedmap[mapX][mapY];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (this._tileProp(mapX, mapY, x, y, 'wall') === 'true') {
                    stolist.push({ x: x * 25, y: y * 25, width: 25, height: 25 });
                }
            }
        }
        return stolist;
    }

    // Mirrors Level.createenemys(): spawn dogs, guards, wizards, knight boss.
    // Orientation: 0=down, 1=right, 2=left, 3=up
    createEnemies(mapX, mapY) {
        const stolist = [];
        const map = this.storedmap[mapX][mapY];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {

                // Dogs
                const dog = this._tileProp(mapX, mapY, x, y, 'dog');
                if      (dog === 'down')  stolist.push(new Dog(0, x * 25, y * 25, this.scene));
                else if (dog === 'right') stolist.push(new Dog(1, x * 25, y * 25, this.scene));
                else if (dog === 'left')  stolist.push(new Dog(2, x * 25, y * 25, this.scene));
                else if (dog === 'up')    stolist.push(new Dog(3, x * 25, y * 25, this.scene));

                // Guards
                const guard = this._tileProp(mapX, mapY, x, y, 'guardspawn');
                if      (guard === 'down')  stolist.push(new Guard(0, x * 25, y * 25, this.scene));
                else if (guard === 'right') stolist.push(new Guard(1, x * 25, y * 25, this.scene));
                else if (guard === 'left')  stolist.push(new Guard(2, x * 25, y * 25, this.scene));
                else if (guard === 'up')    stolist.push(new Guard(3, x * 25, y * 25, this.scene));

                // Wizards
                const wizard = this._tileProp(mapX, mapY, x, y, 'wizard');
                if      (wizard === 'down')  stolist.push(new Wizard(x * 25, y * 25, 0, this.scene));
                else if (wizard === 'right') stolist.push(new Wizard(x * 25, y * 25, 1, this.scene));
                else if (wizard === 'left')  stolist.push(new Wizard(x * 25, y * 25, 2, this.scene));
                else if (wizard === 'up')    stolist.push(new Wizard(x * 25, y * 25, 3, this.scene));

                // Knight boss
                if (this._tileProp(mapX, mapY, x, y, 'knightboss') === 'true') {
                    stolist.push(new KnightBoss(x * 25, y * 25, x, y, false, this.scene));
                }
            }
        }
        return stolist;
    }

    // Mirrors Level.createobjects(): spawn all interactive objects.
    createObjects(mapX, mapY) {
        const stolist = [];
        const map = this.storedmap[mapX][mapY];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {

                // GuardPath waypoints
                const gp = this._tileProp(mapX, mapY, x, y, 'guardpoint');
                const gpStop = this._tileProp(mapX, mapY, x, y, 'stop') === 'true';
                if      (gp === 'down')  stolist.push(new GuardPath(0, x * 25, y * 25, gpStop));
                else if (gp === 'right') stolist.push(new GuardPath(1, x * 25, y * 25, gpStop));
                else if (gp === 'left')  stolist.push(new GuardPath(2, x * 25, y * 25, gpStop));
                else if (gp === 'up')    stolist.push(new GuardPath(3, x * 25, y * 25, gpStop));

                if (this._tileProp(mapX, mapY, x, y, 'princess') === 'true') {
                    stolist.push(new Princess(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'cratespawn') === 'true') {
                    stolist.push(new Crate(x * 25, y * 25, this.scene));
                }

                const door = this._tileProp(mapX, mapY, x, y, 'door');
                if      (door === 'closed') stolist.push(new Door(true,  x * 25, y * 25, this.scene));
                else if (door === 'open')   stolist.push(new Door(false, x * 25, y * 25, this.scene));

                if (this._tileProp(mapX, mapY, x, y, 'doorbutton') === 'true') {
                    stolist.push(new DoorButton(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'key') === 'true') {
                    stolist.push(new Key(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'keydoor') === 'true') {
                    stolist.push(new KeyDoor(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'exit') === 'true') {
                    const dir = this._tileProp(mapX, mapY, x, y, 'direction', 'null');
                    stolist.push(new Exit(x * 25, y * 25, dir, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'window') === 'true') {
                    stolist.push(new Window(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'torch') === 'true') {
                    stolist.push(new Torch(x * 25, y * 25, this.scene));
                }
                if (this._tileProp(mapX, mapY, x, y, 'tracker') === 'true') {
                    stolist.push(new Tracker());
                }
                if (this._tileProp(mapX, mapY, x, y, 'bossactivate') === 'true') {
                    stolist.push(new KnightBossInitialActivate(x * 25, y * 25));
                }
                if (this._tileProp(mapX, mapY, x, y, 'bossactivatespawn') === 'true') {
                    stolist.push(new KnightBossSpawn(x * 25, y * 25));
                }
                if (this._tileProp(mapX, mapY, x, y, 'final') === 'true') {
                    stolist.push(new FinalCutscene(x * 25, y * 25));
                }
            }
        }
        return stolist;
    }

    // --- TMX parsing helpers ---

    // Parse a TMX file from Phaser's XML cache and store the result in
    // this.storedmap[x][y] = { tileProps, tiles, width, height, firstgid }.
    // tileProps: Map<tileId, {propName: propValue}>
    // tiles: flat uint32 array of GIDs, row-major (index = y*width + x)
    async _parseTMXInto(cacheKey, x, y) {
        if (!this.storedmap[x]) this.storedmap[x] = [];
        this.storedmap[x][y] = await this._parseTMX(cacheKey);
    }

    async _parseTMX(cacheKey) {
        const xml  = this.scene.cache.xml.get(cacheKey);
        const mapEl = xml.documentElement;

        const width  = parseInt(mapEl.getAttribute('width'));
        const height = parseInt(mapEl.getAttribute('height'));

        // firstgid: the offset added to tile IDs in the layer data
        const tilesetEl = mapEl.querySelector('tileset');
        const firstgid  = parseInt(tilesetEl.getAttribute('firstgid')) || 1;

        // Build tileId → properties map
        const tileProps = {};
        tilesetEl.querySelectorAll('tile').forEach(tile => {
            const id = parseInt(tile.getAttribute('id'));
            const props = {};
            tile.querySelectorAll('property').forEach(prop => {
                const name = prop.getAttribute('name');
                if (name) props[name] = prop.getAttribute('value');
            });
            tileProps[id] = props;
        });

        // Decode base64+gzip layer data to a flat uint32 GID array
        const dataEl  = mapEl.querySelector('layer data');
        const base64  = dataEl.textContent.trim();
        const tiles   = await this._decodeBase64Gzip(base64);

        return { tileProps, tiles, width, height, firstgid };
    }

    // Decompress base64-encoded gzip data and return a flat array of uint32 GIDs.
    async _decodeBase64Gzip(base64) {
        // Decode base64 → raw bytes
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // Decompress gzip using the Web Streams DecompressionStream API
        const ds     = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(bytes);
        writer.close();

        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // Concatenate chunks
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const result   = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        // Interpret as little-endian uint32 GIDs
        const view  = new DataView(result.buffer);
        const count = result.length / 4;
        const gids  = new Array(count);
        for (let i = 0; i < count; i++) {
            gids[i] = view.getUint32(i * 4, true);
        }
        return gids;
    }

    // Look up a tile property at grid position (tileX, tileY) in storedmap[mapX][mapY].
    // Returns defaultVal if the tile or property is not found.
    _tileProp(mapX, mapY, tileX, tileY, propName, defaultVal = 'false') {
        const map    = this.storedmap[mapX][mapY];
        const gid    = map.tiles[tileY * map.width + tileX];
        if (!gid) return defaultVal;  // GID 0 = empty tile
        const tileId = gid - map.firstgid;
        const props  = map.tileProps[tileId];
        if (!props || props[propName] === undefined) return defaultVal;
        return props[propName];
    }
}
