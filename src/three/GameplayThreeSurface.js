// GameplayThreeSurface.js — bootstrap and lifecycle for the gameplay Three.js canvas

const SURFACE_ELEMENT_ID = 'gameplay-three-canvas';
const TILE_WORLD_SIZE    = 1;
const WALL_HEIGHT        = 0.78;
const CAMERA_FOV         = 26;
const CAMERA_HEIGHT_MULT = 1.58;
const CAMERA_Z_MULT      = 0.60;
const FLOOR_RENDER_LAYER = 0;
const WALL_RENDER_LAYER  = 4;
const BILLBOARD_RENDER_LAYER = 8;

export default class GameplayThreeSurface {

    constructor(scene) {
        this.scene      = scene;
        this.THREE      = null;
        this.renderer   = null;
        this.scene3d    = null;
        this.camera     = null;
        this.worldRoot  = null;
        this.billboardRoot = null;
        this.domElement = null;
        this.isBooted   = false;
        this.floorGeometry = null;
        this.wallGeometry  = null;
        this.currentMapWidth  = 25;
        this.currentMapHeight = 25;
        this.currentMapMaxDim = 25;
        this.tileTextureCache   = {};
        this.floorMaterialCache = {};
        this.wallMaterialCache  = {};
        this.displayTextureCache = {};
        this.billboardEntries    = new Map();

        this._handleResize = this.resize.bind(this);
    }

    boot() {
        if (this.isBooted) {
            this.setVisible(true);
            this.resize();
            return true;
        }

        const THREE = window.THREE;
        if (!THREE) {
            console.error('GameplayThreeSurface: window.THREE is unavailable.');
            return false;
        }
        this.THREE = THREE;

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            console.error('GameplayThreeSurface: #game-container was not found.');
            return false;
        }

        this.scene3d = new THREE.Scene();
        this.worldRoot = new THREE.Group();
        this.billboardRoot = new THREE.Group();
        this.scene3d.add(this.worldRoot);
        this.scene3d.add(this.billboardRoot);
        this.floorGeometry = new THREE.PlaneGeometry(TILE_WORLD_SIZE, TILE_WORLD_SIZE);
        this.wallGeometry  = new THREE.BoxGeometry(TILE_WORLD_SIZE, WALL_HEIGHT, TILE_WORLD_SIZE);

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            alpha:           true,
            antialias:       false,
            powerPreference: 'high-performance'
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        this.domElement = this.renderer.domElement;
        this.domElement.id = SURFACE_ELEMENT_ID;
        this.domElement.dataset.renderSurface = 'three';
        this.domElement.style.position = 'absolute';
        this.domElement.style.left = '0px';
        this.domElement.style.top = '0px';
        this.domElement.style.width = '0px';
        this.domElement.style.height = '0px';
        this.domElement.style.pointerEvents = 'none';
        this.domElement.style.zIndex = '40';
        this.domElement.style.display = 'block';
        this.domElement.style.background = 'transparent';

        const existingElement = document.getElementById(SURFACE_ELEMENT_ID);
        if (existingElement && existingElement !== this.domElement) {
            existingElement.remove();
        }
        gameContainer.appendChild(this.domElement);

        window.addEventListener('resize', this._handleResize);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this._handleResize);

        this.isBooted = true;
        this.resize();
        this.render();
        return true;
    }

    resize() {
        if (!this.isBooted || !this.renderer || !this.domElement || !this.camera) {
            return;
        }

        const gameCanvas = this.scene.game ? this.scene.game.canvas : null;
        const gameContainer = document.getElementById('game-container');
        if (!gameCanvas || !gameContainer) {
            return;
        }

        const canvasRect = gameCanvas.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();
        const width  = Math.max(1, Math.round(canvasRect.width));
        const height = Math.max(1, Math.round(canvasRect.height));

        this.domElement.style.left = Math.round(canvasRect.left - containerRect.left) + 'px';
        this.domElement.style.top  = Math.round(canvasRect.top - containerRect.top) + 'px';
        this.domElement.style.width  = width + 'px';
        this.domElement.style.height = height + 'px';

        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(width, height, false);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    render() {
        if (!this.isBooted || !this.renderer || !this.scene3d || !this.camera || !this.domElement) {
            return;
        }
        if (this.domElement.style.display === 'none') {
            return;
        }

        this.renderer.render(this.scene3d, this.camera);
    }

    updateCameraForPlayer(player) {
        if (!this.camera || !player) {
            return;
        }

        const targetX = (player.x + 12.5) / 25;
        const targetZ = (player.y + 25) / 25;
        const maxDim  = this.currentMapMaxDim || 25;

        this.camera.fov = CAMERA_FOV;
        this.camera.position.set(
            targetX,
            maxDim * CAMERA_HEIGHT_MULT,
            targetZ + maxDim * CAMERA_Z_MULT
        );
        this.camera.lookAt(targetX, 0, targetZ);
        this.camera.updateProjectionMatrix();
    }

    buildTileWorld(map) {
        if (!this.isBooted || !this.worldRoot || !map) {
            return;
        }

        this.currentMapWidth  = map.width;
        this.currentMapHeight = map.height;
        this.currentMapMaxDim = Math.max(map.width, map.height);
        this.clearWorld();
        this._positionCameraForMap(map);
        const THREE = this.THREE;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const gid = map.tiles[y * map.width + x];
                if (!gid) {
                    continue;
                }

                const tileInfo = this._tileInfoForGid(gid, map.tilesets);
                if (!tileInfo) {
                    continue;
                }

                const tileProps = map.tileProps[gid] || null;
                const isWallTile = !!(tileProps && tileProps.wall === 'true');
                const worldX = x + 0.5;
                const worldZ = y + 0.5;

                if (isWallTile) {
                    const wallMesh = new THREE.Mesh(
                        this.wallGeometry,
                        this._getWallMaterials(tileInfo.tilesetKey, tileInfo.localId)
                    );
                    wallMesh.position.set(worldX, WALL_HEIGHT / 2, worldZ);
                    wallMesh.renderOrder = this._depthRenderOrderFromWorldZ(worldZ, WALL_RENDER_LAYER);
                    this.worldRoot.add(wallMesh);
                } else {
                    const floorMesh = new THREE.Mesh(
                        this.floorGeometry,
                        this._getFloorMaterial(tileInfo.tilesetKey, tileInfo.localId)
                    );
                    floorMesh.rotation.x = -Math.PI / 2;
                    floorMesh.position.set(worldX, 0, worldZ);
                    floorMesh.renderOrder = FLOOR_RENDER_LAYER;
                    this.worldRoot.add(floorMesh);
                }
            }
        }
    }

    clearWorld() {
        if (!this.worldRoot) {
            return;
        }

        while (this.worldRoot.children.length > 0) {
            this.worldRoot.remove(this.worldRoot.children[0]);
        }
    }

    syncWorldDisplayObjects(displayObjects) {
        if (!this.isBooted || !this.billboardRoot) {
            return;
        }

        const seenEntries = new Set();
        for (const displayObject of displayObjects || []) {
            if (!displayObject || !displayObject.frame || !displayObject.texture) {
                continue;
            }

            const entry = this._getOrCreateBillboardEntry(displayObject);
            if (!entry) {
                continue;
            }

            this._syncBillboardEntry(entry, displayObject);
            seenEntries.add(displayObject);
        }

        for (const [displayObject, entry] of this.billboardEntries.entries()) {
            if (!seenEntries.has(displayObject)) {
                this._restoreSourceDisplayObject(entry, displayObject);
                this.billboardRoot.remove(entry.sprite);
                if (entry.material && entry.material.dispose) {
                    entry.material.dispose();
                }
                this.billboardEntries.delete(displayObject);
            }
        }
    }

    setVisible(isVisible) {
        if (!this.domElement) {
            return;
        }
        this.domElement.style.display = isVisible ? 'block' : 'none';
    }

    shutdown() {
        if (!this.isBooted) {
            return;
        }

        window.removeEventListener('resize', this._handleResize);
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this._handleResize);

        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.forceContextLoss) {
                this.renderer.forceContextLoss();
            }
        }

        this._disposeCachedThreeResources();
        this.THREE      = null;
        this.renderer   = null;
        this.scene3d    = null;
        this.camera     = null;
        this.floorGeometry = null;
        this.wallGeometry  = null;
        this.worldRoot  = null;
        this.billboardRoot = null;
        this.domElement = null;
        this.isBooted   = false;
    }

    _positionCameraForMap(map) {
        if (!this.camera) {
            return;
        }

        const centerX = map.width / 2;
        const centerZ = map.height / 2;
        const maxDim  = Math.max(map.width, map.height);

        // Baseline placement before the player-follow update kicks in.
        this.camera.fov = CAMERA_FOV;
        this.camera.position.set(
            centerX - 0.5,
            maxDim * CAMERA_HEIGHT_MULT,
            centerZ + maxDim * CAMERA_Z_MULT
        );
        this.camera.lookAt(centerX - 0.5, 0, centerZ - 0.5);
        this.camera.updateProjectionMatrix();
    }

    _tileInfoForGid(gid, tilesets) {
        if (!Array.isArray(tilesets) || gid <= 0) {
            return null;
        }

        let matchedTileset = null;
        for (const tileset of tilesets) {
            if (gid >= tileset.firstgid) {
                matchedTileset = tileset;
            } else {
                break;
            }
        }

        if (!matchedTileset) {
            return null;
        }

        return {
            tilesetKey: this._baseTilesetKey(matchedTileset.imageKey || matchedTileset.name),
            localId:    gid - matchedTileset.firstgid
        };
    }

    _baseTilesetKey(textureKey) {
        return String(textureKey || '').replace(/_tilemap$/, '');
    }

    _depthRenderOrderFromWorldZ(worldZ, layerOffset) {
        return Math.round(worldZ * 100) * 10 + layerOffset;
    }

    _getFloorMaterial(tilesetKey, localId) {
        const cacheKey = tilesetKey + ':' + localId;
        if (this.floorMaterialCache[cacheKey]) {
            return this.floorMaterialCache[cacheKey];
        }

        const material = new this.THREE.MeshBasicMaterial({
            map:         this._getTileTexture(tilesetKey, localId),
            transparent: false,
            alphaTest:   0.1
        });
        this.floorMaterialCache[cacheKey] = material;
        return material;
    }

    _getWallMaterials(tilesetKey, localId) {
        const cacheKey = tilesetKey + ':' + localId;
        if (this.wallMaterialCache[cacheKey]) {
            return this.wallMaterialCache[cacheKey];
        }

        const THREE = this.THREE;
        const texture = this._getTileTexture(tilesetKey, localId);
        const sideMaterial = new THREE.MeshBasicMaterial({
            map:         texture,
            color:       0x888888,
            transparent: false,
            alphaTest:   0.1
        });
        const topMaterial = new THREE.MeshBasicMaterial({
            map:         texture,
            transparent: false,
            alphaTest:   0.1
        });

        const materials = [
            sideMaterial,
            sideMaterial,
            topMaterial,
            sideMaterial,
            sideMaterial,
            sideMaterial
        ];
        this.wallMaterialCache[cacheKey] = materials;
        return materials;
    }

    _getTileTexture(tilesetKey, localId) {
        const cacheKey = tilesetKey + ':' + localId;
        if (this.tileTextureCache[cacheKey]) {
            return this.tileTextureCache[cacheKey];
        }

        const sourceTexture = this.scene.textures.get(tilesetKey);
        if (!sourceTexture) {
            console.warn('GameplayThreeSurface: missing Phaser texture for', tilesetKey);
            return null;
        }

        const sourceImage = sourceTexture.getSourceImage();
        const columns = Math.max(1, Math.floor(sourceImage.width / 25));
        const sourceX = (localId % columns) * 25;
        const sourceY = Math.floor(localId / columns) * 25;
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width  = 25;
        tileCanvas.height = 25;

        const context = tileCanvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, 25, 25);
        context.drawImage(sourceImage, sourceX, sourceY, 25, 25, 0, 0, 25, 25);

        const texture = new this.THREE.CanvasTexture(tileCanvas);
        texture.magFilter = this.THREE.NearestFilter;
        texture.minFilter = this.THREE.NearestFilter;
        texture.generateMipmaps = false;
        if ('colorSpace' in texture && this.THREE.SRGBColorSpace) {
            texture.colorSpace = this.THREE.SRGBColorSpace;
        }

        this.tileTextureCache[cacheKey] = texture;
        return texture;
    }

    _getOrCreateBillboardEntry(displayObject) {
        if (this.billboardEntries.has(displayObject)) {
            return this.billboardEntries.get(displayObject);
        }

        const texture = this._getDisplayTexture(displayObject);
        if (!texture) {
            return null;
        }

        const material = new this.THREE.SpriteMaterial({
            map:         texture,
            transparent: false,
            alphaTest:   0.1,
            depthTest:   false,
            depthWrite:  false
        });
        const sprite = new this.THREE.Sprite(material);
        sprite.center.set(0.5, 0);
        this.billboardRoot.add(sprite);

        const entry = {
            sprite,
            material,
            textureKey: null,
            sourceAlpha: Number.isFinite(displayObject.alpha) ? displayObject.alpha : 1
        };
        this.billboardEntries.set(displayObject, entry);
        return entry;
    }

    _syncBillboardEntry(entry, displayObject) {
        const texture = this._getDisplayTexture(displayObject);
        const textureKey = this._displayTextureCacheKey(displayObject);
        if (texture && entry.textureKey !== textureKey) {
            entry.material.map = texture;
            entry.material.needsUpdate = true;
            entry.textureKey = textureKey;
        }

        const topLeft = displayObject.getTopLeft
            ? displayObject.getTopLeft()
            : { x: displayObject.x || 0, y: displayObject.y || 0 };
        const width  = displayObject.displayWidth  || displayObject.width  || 25;
        const height = displayObject.displayHeight || displayObject.height || 25;

        entry.sprite.position.set(
            (topLeft.x + width / 2) / 25,
            0.04,
            (topLeft.y + height) / 25
        );
        entry.sprite.scale.set(width / 25, height / 25, 1);
        entry.sprite.visible = !!displayObject.visible;
        entry.sprite.renderOrder = this._depthRenderOrderFromWorldZ(
            (topLeft.y + height) / 25,
            BILLBOARD_RENDER_LAYER
        );

        if (displayObject.setAlpha && displayObject.alpha !== 0) {
            displayObject.setAlpha(0);
        }
    }

    _displayTextureCacheKey(displayObject) {
        const frame = displayObject.frame;
        return [
            frame.texture.key,
            frame.name,
            frame.cutX,
            frame.cutY,
            frame.cutWidth,
            frame.cutHeight
        ].join(':');
    }

    _getDisplayTexture(displayObject) {
        const cacheKey = this._displayTextureCacheKey(displayObject);
        if (this.displayTextureCache[cacheKey]) {
            return this.displayTextureCache[cacheKey];
        }

        const frame = displayObject.frame;
        const sourceImage = frame.source.image;
        const frameWidth  = frame.cutWidth;
        const frameHeight = frame.cutHeight;
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width  = frameWidth;
        frameCanvas.height = frameHeight;

        const context = frameCanvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, frameWidth, frameHeight);
        context.drawImage(
            sourceImage,
            frame.cutX,
            frame.cutY,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth,
            frameHeight
        );

        const texture = new this.THREE.CanvasTexture(frameCanvas);
        texture.magFilter = this.THREE.NearestFilter;
        texture.minFilter = this.THREE.NearestFilter;
        texture.generateMipmaps = false;
        if ('colorSpace' in texture && this.THREE.SRGBColorSpace) {
            texture.colorSpace = this.THREE.SRGBColorSpace;
        }

        this.displayTextureCache[cacheKey] = texture;
        return texture;
    }

    _disposeCachedThreeResources() {
        for (const texture of Object.values(this.tileTextureCache)) {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        }
        for (const texture of Object.values(this.displayTextureCache)) {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        }

        for (const material of Object.values(this.floorMaterialCache)) {
            if (material && material.dispose) {
                material.dispose();
            }
        }

        const seenMaterials = new Set();
        for (const materials of Object.values(this.wallMaterialCache)) {
            for (const material of materials || []) {
                if (material && material.dispose && !seenMaterials.has(material)) {
                    seenMaterials.add(material);
                    material.dispose();
                }
            }
        }
        for (const [displayObject, entry] of this.billboardEntries.entries()) {
            this._restoreSourceDisplayObject(entry, displayObject);
            if (entry.material && entry.material.dispose) {
                entry.material.dispose();
            }
        }

        if (this.floorGeometry && this.floorGeometry.dispose) {
            this.floorGeometry.dispose();
        }
        if (this.wallGeometry && this.wallGeometry.dispose) {
            this.wallGeometry.dispose();
        }

        this.tileTextureCache   = {};
        this.displayTextureCache = {};
        this.floorMaterialCache = {};
        this.wallMaterialCache  = {};
        this.billboardEntries.clear();
    }

    _restoreSourceDisplayObject(entry, displayObject) {
        if (!displayObject || !displayObject.setAlpha) {
            return;
        }

        const restoreAlpha = Number.isFinite(entry && entry.sourceAlpha)
            ? entry.sourceAlpha
            : 1;
        displayObject.setAlpha(restoreAlpha);
    }
}
