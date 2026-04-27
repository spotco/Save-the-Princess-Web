// GameplayRenderer.js — gameplay-world renderer seam for 2D and 3D modes

class PhaserTilemapGameplayRenderer {

    constructor(scene) {
        this.scene          = scene;
        this.currentTilemap = null;
    }

    rebuildScreen(game, mapX, mapY) {
        if (this.currentTilemap) {
            this.currentTilemap.destroy();
            this.currentTilemap = null;
        }

        const map = game.level.storedmap[mapX][mapY];

        // Build 2D array: -1 = empty, otherwise use TMX gid space minus 1 so
        // multiple tilesets can render into the same generated tilemap layer.
        const tileData = [];
        for (let y = 0; y < map.height; y++) {
            const row = [];
            for (let x = 0; x < map.width; x++) {
                const gid = map.tiles[y * map.width + x];
                row.push(gid > 0 ? gid - 1 : -1);
            }
            tileData.push(row);
        }

        const tilemap = this.scene.make.tilemap({
            data:       tileData,
            tileWidth:  25,
            tileHeight: 25,
            width:      map.width,
            height:     map.height
        });
        const tilesets = [];
        for (const tilesetInfo of map.tilesets) {
            const tileset = tilemap.addTilesetImage(
                tilesetInfo.name,
                tilesetInfo.imageKey,
                25,
                25,
                0,
                0,
                tilesetInfo.firstgid - 1
            );
            if (tileset) {
                tilesets.push(tileset);
            }
        }
        const layer = tilemap.createLayer(0, tilesets, 0, 0);
        layer.setDepth(0);

        this.currentTilemap = tilemap;
    }

    shutdown() {
        if (this.currentTilemap) {
            this.currentTilemap.destroy();
            this.currentTilemap = null;
        }
    }
}

class Gameplay2DModeRenderer {

    constructor(tilemapRenderer) {
        this.tilemapRenderer = tilemapRenderer;
    }

    activate(game) {}
    deactivate(game) {}

    rebuildScreen(game, mapX, mapY) {
        this.tilemapRenderer.rebuildScreen(game, mapX, mapY);
    }

    render(game) {}
}

class Gameplay3DModeRenderer {

    constructor(tilemapRenderer, gameplayThreeSurface) {
        this.tilemapRenderer       = tilemapRenderer;
        this.gameplayThreeSurface  = gameplayThreeSurface;
    }

    activate(game) {
        if (this.gameplayThreeSurface) {
            this.gameplayThreeSurface.boot();
        }
    }

    deactivate(game) {
        if (this.gameplayThreeSurface) {
            this.gameplayThreeSurface.shutdown();
        }
    }

    rebuildScreen(game, mapX, mapY) {
        this.tilemapRenderer.shutdown();
        if (this.gameplayThreeSurface) {
            this.gameplayThreeSurface.buildTileWorld(game.level.storedmap[mapX][mapY]);
        }
    }

    render(game) {
        if (this.gameplayThreeSurface) {
            this.gameplayThreeSurface.syncWorldDisplayObjects(game.collectWorldDisplayObjects());
            this.gameplayThreeSurface.updateCameraForPlayer(game.player);
            this.gameplayThreeSurface.render();
        }
    }
}

export default class GameplayRenderer {

    constructor(scene, gameplayThreeSurface) {
        this.scene                = scene;
        this.tilemapRenderer      = new PhaserTilemapGameplayRenderer(scene);
        this.renderer2d           = new Gameplay2DModeRenderer(this.tilemapRenderer);
        this.renderer3d           = new Gameplay3DModeRenderer(this.tilemapRenderer, gameplayThreeSurface);
        this.activeMode           = null;
        this.activeModeRenderer   = null;
    }

    setMode(mode, game) {
        const nextMode = mode === '3d' ? '3d' : '2d';

        if (this.activeMode === nextMode && this.activeModeRenderer) {
            return;
        }

        if (this.activeModeRenderer) {
            this.activeModeRenderer.deactivate(game);
        }

        this.activeMode = nextMode;
        this.activeModeRenderer = nextMode === '3d' ? this.renderer3d : this.renderer2d;
        this.activeModeRenderer.activate(game);
    }

    rebuildScreen(game, mapX, mapY) {
        if (!this.activeModeRenderer) {
            this.setMode('2d', game);
        }
        this.activeModeRenderer.rebuildScreen(game, mapX, mapY);
    }

    render(game) {
        if (this.activeModeRenderer) {
            this.activeModeRenderer.render(game);
        }
    }

    shutdown(game) {
        if (this.activeModeRenderer) {
            this.activeModeRenderer.deactivate(game);
        }
        this.tilemapRenderer.shutdown();
        this.activeMode         = null;
        this.activeModeRenderer = null;
    }
}
