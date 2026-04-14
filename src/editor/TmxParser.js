// TmxParser.js — shared TMX/TSX parsing helpers
//
// These methods were originally part of Level.java's (JS: Level.js) private
// parsing section. Extracted here so StpLevelFormat and any future tooling
// can reuse the same logic without duplicating it in the level classes.
//
// All methods are static. No Phaser scene state is required except for
// parseTMX(), which reads the already-loaded XML document from the Phaser
// cache.

export default class TmxParser {

    // Parse a TMX file from Phaser's XML cache and return a map data object:
    //   { tileProps, tiles, width, height, tilesets }
    // tileProps:  plain object  gid (string key) → { propName: propValue, … }
    // tiles:      flat number[] of GIDs, row-major (index = y * width + x)
    // tilesets:   { name, imageKey, firstgid }[] in declaration order
    static async parseTMX(scene, cacheKey) {
        const xml    = scene.cache.xml.get(cacheKey);
        const mapEl  = xml.documentElement;

        const width  = parseInt(mapEl.getAttribute('width'));
        const height = parseInt(mapEl.getAttribute('height'));

        const tileProps = {};
        const tilesets  = [];

        for (const tilesetEl of Array.from(mapEl.querySelectorAll('tileset'))) {
            const firstgid   = parseInt(tilesetEl.getAttribute('firstgid')) || 1;
            const tilesetDef = await TmxParser._getTilesetDefinition(tilesetEl);

            tilesets.push({
                name:     tilesetDef.name,
                imageKey: tilesetDef.imageKey,
                firstgid
            });

            for (const tile of tilesetDef.tileEls) {
                const gid   = firstgid + parseInt(tile.getAttribute('id'));
                const props = {};
                const seen  = new Set();
                for (const prop of tile.querySelectorAll('property')) {
                    const name = prop.getAttribute('name');
                    if (name && !seen.has(name)) {
                        props[name] = prop.getAttribute('value');
                        seen.add(name);
                    }
                }
                if (Object.keys(props).length > 0) {
                    tileProps[gid] = props;
                }
            }
        }

        const dataEl = mapEl.querySelector('layer data');
        const base64 = dataEl.textContent.trim();
        const tiles  = await TmxParser._decodeBase64Gzip(base64);

        return { tileProps, tiles, width, height, tilesets };
    }

    // Resolve a <tileset> element to { name, imageKey, tileEls }.
    // Handles both inline tilesets and external TSX references.
    static async _getTilesetDefinition(tilesetEl) {
        const source = tilesetEl.getAttribute('source');

        if (!source) {
            const name = tilesetEl.getAttribute('name');
            return {
                name,
                imageKey: TmxParser.getTilemapImageKey(name),
                tileEls:  Array.from(tilesetEl.querySelectorAll('tile'))
            };
        }

        const tsxPath    = TmxParser._resolveTSXPath(source);
        const response   = await fetch(tsxPath);
        const tsxText    = await response.text();
        const tsxDoc     = new DOMParser().parseFromString(tsxText, 'application/xml');
        const tsxRoot    = tsxDoc.documentElement;
        const name       = tsxRoot.getAttribute('name') || TmxParser._basenameWithoutExt(source);
        const imageEl    = tsxRoot.querySelector('image');
        const imageSrc   = imageEl ? imageEl.getAttribute('source') : null;

        return {
            name,
            imageKey: TmxParser.getTilemapImageKey(TmxParser._basenameWithoutExt(imageSrc || source)),
            tileEls:  Array.from(tsxRoot.querySelectorAll('tile'))
        };
    }

    // Map a tileset name to the Phaser texture key used for tilemap rendering.
    // The three game tilesets are loaded as tilemap textures with a '_tilemap' suffix.
    static getTilemapImageKey(name) {
        if (name === 'tileset1' || name === 'guard1set' || name === 'wizard1set') {
            return name + '_tilemap';
        }
        return name;
    }

    static _resolveTSXPath(source) {
        return 'img/' + source.replace(/^.*[\\/]/, '');
    }

    static _basenameWithoutExt(path) {
        return path.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    }

    // Decompress base64-encoded gzip data and return a flat array of uint32 GIDs.
    static async _decodeBase64Gzip(base64) {
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

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

        const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
        const result   = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }

        const view  = new DataView(result.buffer);
        const count = result.length / 4;
        const gids  = new Array(count);
        for (let i = 0; i < count; i++) gids[i] = view.getUint32(i * 4, true);
        return gids;
    }
}
