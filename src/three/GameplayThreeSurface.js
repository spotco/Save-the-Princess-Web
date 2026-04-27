// GameplayThreeSurface.js — bootstrap and lifecycle for the gameplay Three.js canvas

const SURFACE_ELEMENT_ID = 'gameplay-three-canvas';
const TILE_WORLD_SIZE    = 1;
const WALL_HEIGHT        = 0.78;
const WALL_CORNER_SEAM_SIZE      = 0.07;
const WALL_CORNER_SEAM_TOP_INSET = 0.01;
const CAMERA_FOV         = 26;
const CAMERA_HEIGHT_MULT = 1.58;
const CAMERA_Z_MULT      = 0.60;
const WALL_SIDE_TEXTURE_WIDTH  = 16;
const WALL_SIDE_TEXTURE_HEIGHT = 64;
const WALL_SIDE_SAMPLE_ROWS    = 6;
const SHARED_WALL_SIDE_TEXTURE_CACHE_KEY = 'shared-wall-side';
const SHARED_WALL_CORNER_SEAM_MATERIAL_CACHE_KEY = 'shared-wall-corner-seam';
const DEFAULT_WALL_SIDE_TILESET_KEY = 'tileset1';
const DEFAULT_WALL_SIDE_LOCAL_ID    = 0;
const FLOOR_RENDER_LAYER = 0;
const FLOOR_FACE_RENDER_LAYER = 2;
const WALL_RENDER_LAYER  = 4;
const WALL_TOP_FACE_RENDER_LAYER = 6;
const BILLBOARD_RENDER_LAYER = 8;
const FLOOR_FACE_Y_OFFSET = 0.015;
const WALL_TOP_FACE_Y_OFFSET = 0.01;

export default class GameplayThreeSurface {

    constructor(scene) {
        this.scene      = scene;
        this.THREE      = null;
        this.renderer   = null;
        this.scene3d    = null;
        this.camera     = null;
        this.worldRoot  = null;
        this.floorFaceRoot = null;
        this.wallTopFaceRoot = null;
        this.billboardRoot = null;
        this.domElement = null;
        this.isBooted   = false;
        this.floorGeometry = null;
        this.wallGeometry  = null;
        this.wallCornerSeamGeometry = null;
        this.wallTopFaceGeometry = null;
        this.currentMapWidth  = 25;
        this.currentMapHeight = 25;
        this.currentMapMaxDim = 25;
        this.tileTextureCache   = {};
        this.wallSideTextureCache = {};
        this.floorMaterialCache = {};
        this.wallMaterialCache  = {};
        this.wallCornerSeamMaterialCache = {};
        this.displayTextureCache = {};
        this.floorFaceEntries    = new Map();
        this.wallTopFaceEntries  = new Map();
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
        this.floorFaceRoot = new THREE.Group();
        this.wallTopFaceRoot = new THREE.Group();
        this.billboardRoot = new THREE.Group();
        this.scene3d.add(this.worldRoot);
        this.scene3d.add(this.floorFaceRoot);
        this.scene3d.add(this.wallTopFaceRoot);
        this.scene3d.add(this.billboardRoot);
        this.floorGeometry = new THREE.PlaneGeometry(TILE_WORLD_SIZE, TILE_WORLD_SIZE);
        this.wallGeometry  = new THREE.BoxGeometry(TILE_WORLD_SIZE, WALL_HEIGHT, TILE_WORLD_SIZE);
        this.wallCornerSeamGeometry = new THREE.BoxGeometry(
            WALL_CORNER_SEAM_SIZE,
            WALL_HEIGHT - WALL_CORNER_SEAM_TOP_INSET,
            WALL_CORNER_SEAM_SIZE
        );
        this.wallTopFaceGeometry = new THREE.PlaneGeometry(TILE_WORLD_SIZE, TILE_WORLD_SIZE);

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
        const wallTilesByCell = Array.from({ length: map.height }, () => Array(map.width).fill(null));

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
                    wallTilesByCell[y][x] = tileInfo.tilesetKey;
                    const wallMesh = new THREE.Mesh(
                        this.wallGeometry,
                        this._getWallMaterials(tileInfo.tilesetKey, tileInfo.localId, tileProps)
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

        this._buildWallCornerSeams(wallTilesByCell);
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
        if (!this.isBooted || !this.billboardRoot || !this.wallTopFaceRoot || !this.floorFaceRoot) {
            return;
        }

        const seenEntries = new Set();
        for (const displayObject of displayObjects || []) {
            if (!displayObject || !displayObject.frame || !displayObject.texture) {
                continue;
            }

            const renderMode = this._getDisplayObjectRenderMode(displayObject);
            if (renderMode !== 'billboard' && this.billboardEntries.has(displayObject)) {
                this._removeBillboardEntry(displayObject, this.billboardEntries.get(displayObject));
            }
            if (renderMode !== 'floorFace' && this.floorFaceEntries.has(displayObject)) {
                this._removeFloorFaceEntry(displayObject, this.floorFaceEntries.get(displayObject));
            }
            if (renderMode !== 'wallTopFace' && this.wallTopFaceEntries.has(displayObject)) {
                this._removeWallTopFaceEntry(displayObject, this.wallTopFaceEntries.get(displayObject));
            }

            let entry = null;
            if (renderMode === 'wallTopFace') {
                entry = this._getOrCreateWallTopFaceEntry(displayObject);
            } else if (renderMode === 'floorFace') {
                entry = this._getOrCreateFloorFaceEntry(displayObject);
            } else {
                entry = this._getOrCreateBillboardEntry(displayObject);
            }
            if (!entry) {
                continue;
            }

            if (renderMode === 'wallTopFace') {
                this._syncWallTopFaceEntry(entry, displayObject);
            } else if (renderMode === 'floorFace') {
                this._syncFloorFaceEntry(entry, displayObject);
            } else {
                this._syncBillboardEntry(entry, displayObject);
            }
            seenEntries.add(displayObject);
        }

        for (const [displayObject, entry] of this.billboardEntries.entries()) {
            if (!seenEntries.has(displayObject)) {
                this._removeBillboardEntry(displayObject, entry);
            }
        }
        for (const [displayObject, entry] of this.floorFaceEntries.entries()) {
            if (!seenEntries.has(displayObject)) {
                this._removeFloorFaceEntry(displayObject, entry);
            }
        }
        for (const [displayObject, entry] of this.wallTopFaceEntries.entries()) {
            if (!seenEntries.has(displayObject)) {
                this._removeWallTopFaceEntry(displayObject, entry);
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
        this.wallCornerSeamGeometry = null;
        this.wallTopFaceGeometry = null;
        this.worldRoot  = null;
        this.floorFaceRoot = null;
        this.wallTopFaceRoot = null;
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

    _buildWallCornerSeams(wallTilesByCell) {
        if (!this.worldRoot || !this.wallCornerSeamGeometry) {
            return;
        }

        const height = wallTilesByCell.length;
        const width = height > 0 ? wallTilesByCell[0].length : 0;
        const seamHeight = WALL_HEIGHT - WALL_CORNER_SEAM_TOP_INSET;

        for (let vertexY = 0; vertexY <= height; vertexY++) {
            for (let vertexX = 0; vertexX <= width; vertexX++) {
                const surroundingTiles = [
                    this._getWallTilesetKeyAt(wallTilesByCell, vertexX - 1, vertexY - 1),
                    this._getWallTilesetKeyAt(wallTilesByCell, vertexX, vertexY - 1),
                    this._getWallTilesetKeyAt(wallTilesByCell, vertexX - 1, vertexY),
                    this._getWallTilesetKeyAt(wallTilesByCell, vertexX, vertexY)
                ].filter(Boolean);

                if (surroundingTiles.length !== 1 && surroundingTiles.length !== 3) {
                    continue;
                }

                const seamMesh = new this.THREE.Mesh(
                    this.wallCornerSeamGeometry,
                    this._getWallCornerSeamMaterial(surroundingTiles[0])
                );
                seamMesh.position.set(vertexX, seamHeight / 2, vertexY);
                seamMesh.renderOrder = this._depthRenderOrderFromWorldZ(vertexY, WALL_RENDER_LAYER + 2);
                this.worldRoot.add(seamMesh);
            }
        }
    }

    _getWallTilesetKeyAt(wallTilesByCell, x, y) {
        if (!wallTilesByCell || y < 0 || y >= wallTilesByCell.length || x < 0) {
            return null;
        }
        const row = wallTilesByCell[y];
        if (!row || x >= row.length) {
            return null;
        }
        return row[x] || null;
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

    _getWallMaterials(tilesetKey, localId, tileProps) {
        const cacheKey = tilesetKey + ':' + localId;
        if (this.wallMaterialCache[cacheKey]) {
            return this.wallMaterialCache[cacheKey];
        }

        const THREE = this.THREE;
        const topTexture = this._getTileTexture(tilesetKey, localId);
        const sideTexture = this._getWallSideTexture();
        const sideMaterial = new THREE.MeshBasicMaterial({
            map:         sideTexture,
            transparent: false
        });
        const topMaterial = new THREE.MeshBasicMaterial({
            map:         topTexture,
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

    _getWallCornerSeamMaterial(tilesetKey) {
        if (this.wallCornerSeamMaterialCache[SHARED_WALL_CORNER_SEAM_MATERIAL_CACHE_KEY]) {
            return this.wallCornerSeamMaterialCache[SHARED_WALL_CORNER_SEAM_MATERIAL_CACHE_KEY];
        }

        const material = new this.THREE.MeshBasicMaterial({
            color: 0x000000
        });
        this.wallCornerSeamMaterialCache[SHARED_WALL_CORNER_SEAM_MATERIAL_CACHE_KEY] = material;
        return material;
    }

    _getWallSideTexture() {
        const cacheKey = SHARED_WALL_SIDE_TEXTURE_CACHE_KEY;
        if (this.wallSideTextureCache[cacheKey]) {
            return this.wallSideTextureCache[cacheKey];
        }

        const THREE = this.THREE;
        const baseColor = this._getAverageOpaqueTileColor(
            this._createTileCanvas(DEFAULT_WALL_SIDE_TILESET_KEY, DEFAULT_WALL_SIDE_LOCAL_ID),
            WALL_SIDE_SAMPLE_ROWS
        );
        const sideCanvas = document.createElement('canvas');
        sideCanvas.width  = WALL_SIDE_TEXTURE_WIDTH;
        sideCanvas.height = WALL_SIDE_TEXTURE_HEIGHT;

        const context = sideCanvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, WALL_SIDE_TEXTURE_HEIGHT);
        gradient.addColorStop(0, this._rgbCssString(this._shadeRgbColor(baseColor, 1.18)));
        gradient.addColorStop(0.10, this._rgbCssString(this._shadeRgbColor(baseColor, 1.08)));
        gradient.addColorStop(0.45, this._rgbCssString(this._shadeRgbColor(baseColor, 0.95)));
        gradient.addColorStop(1, this._rgbCssString(this._shadeRgbColor(baseColor, 0.72)));

        context.fillStyle = gradient;
        context.fillRect(0, 0, WALL_SIDE_TEXTURE_WIDTH, WALL_SIDE_TEXTURE_HEIGHT);
        context.fillStyle = this._rgbCssString(this._shadeRgbColor(baseColor, 1.26));
        context.fillRect(0, 0, WALL_SIDE_TEXTURE_WIDTH, 1);
        context.fillStyle = this._rgbCssString(this._shadeRgbColor(baseColor, 0.56));
        context.fillRect(0, WALL_SIDE_TEXTURE_HEIGHT - 2, WALL_SIDE_TEXTURE_WIDTH, 2);

        const texture = new THREE.CanvasTexture(sideCanvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        if ('colorSpace' in texture && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }

        this.wallSideTextureCache[cacheKey] = texture;
        return texture;
    }

    _getAverageOpaqueTilesetColor(tilesetKey) {
        const sourceTexture = this.scene.textures.get(tilesetKey);
        if (!sourceTexture) {
            return null;
        }

        const sourceImage = sourceTexture.getSourceImage();
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width  = sourceImage.width;
        textureCanvas.height = sourceImage.height;

        const context = textureCanvas.getContext('2d', { willReadFrequently: true });
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
        context.drawImage(sourceImage, 0, 0);
        return this._getAverageOpaqueCanvasColorInRange(
            context,
            textureCanvas.width,
            textureCanvas.height,
            0,
            textureCanvas.width,
            0,
            textureCanvas.height,
            24
        );
    }

    _getTileTexture(tilesetKey, localId) {
        const cacheKey = tilesetKey + ':' + localId;
        if (this.tileTextureCache[cacheKey]) {
            return this.tileTextureCache[cacheKey];
        }

        const tileCanvas = this._createTileCanvas(tilesetKey, localId);
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

    _createTileCanvas(tilesetKey, localId) {
        const sourceTexture = this.scene.textures.get(tilesetKey);
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width  = 25;
        tileCanvas.height = 25;
        if (!sourceTexture) {
            console.warn('GameplayThreeSurface: missing Phaser texture for', tilesetKey);
            return tileCanvas;
        }

        const sourceImage = sourceTexture.getSourceImage();
        const columns = Math.max(1, Math.floor(sourceImage.width / 25));
        const sourceX = (localId % columns) * 25;
        const sourceY = Math.floor(localId / columns) * 25;

        const context = tileCanvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, 25, 25);
        context.drawImage(sourceImage, sourceX, sourceY, 25, 25, 0, 0, 25, 25);
        return tileCanvas;
    }

    _getAverageOpaqueTileColor(tileCanvas, sampleRows) {
        const context = tileCanvas.getContext('2d', { willReadFrequently: true });
        const width = tileCanvas.width;
        const height = tileCanvas.height;
        const sampleStartY = Math.max(0, height - Math.max(1, sampleRows || 1));
        const sampledColor = this._getAverageOpaqueCanvasColorInRange(
            context,
            width,
            height,
            0,
            width,
            sampleStartY,
            height
        );
        if (sampledColor) {
            return sampledColor;
        }

        const fullTileColor = this._getAverageOpaqueCanvasColorInRange(
            context,
            width,
            height,
            0,
            width,
            0,
            height
        );
        return fullTileColor || { red: 152, green: 152, blue: 152 };
    }

    _getAverageOpaqueCanvasColorInRange(context, width, height, startX, endX, startY, endY, minimumLuminance) {
        const clampedStartX = Math.max(0, Math.min(width, startX));
        const clampedEndX   = Math.max(clampedStartX, Math.min(width, endX));
        const clampedStartY = Math.max(0, Math.min(height, startY));
        const clampedEndY   = Math.max(clampedStartY, Math.min(height, endY));
        const imageData = context.getImageData(
            clampedStartX,
            clampedStartY,
            clampedEndX - clampedStartX,
            clampedEndY - clampedStartY
        ).data;
        let redTotal   = 0;
        let greenTotal = 0;
        let blueTotal  = 0;
        let pixelCount = 0;

        for (let index = 0; index < imageData.length; index += 4) {
            if (imageData[index + 3] < 8) {
                continue;
            }
            if (minimumLuminance != null) {
                const luminance = (imageData[index] * 0.299) + (imageData[index + 1] * 0.587) + (imageData[index + 2] * 0.114);
                if (luminance < minimumLuminance) {
                    continue;
                }
            }

            redTotal   += imageData[index];
            greenTotal += imageData[index + 1];
            blueTotal  += imageData[index + 2];
            pixelCount++;
        }

        if (pixelCount <= 0) {
            return null;
        }

        return {
            red:   Math.round(redTotal / pixelCount),
            green: Math.round(greenTotal / pixelCount),
            blue:  Math.round(blueTotal / pixelCount)
        };
    }

    _shadeRgbColor(color, brightness) {
        return {
            red:   Math.max(0, Math.min(255, Math.round(color.red * brightness))),
            green: Math.max(0, Math.min(255, Math.round(color.green * brightness))),
            blue:  Math.max(0, Math.min(255, Math.round(color.blue * brightness)))
        };
    }

    _rgbCssString(color) {
        return 'rgb(' + color.red + ', ' + color.green + ', ' + color.blue + ')';
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

    _getOrCreateWallTopFaceEntry(displayObject) {
        if (this.wallTopFaceEntries.has(displayObject)) {
            return this.wallTopFaceEntries.get(displayObject);
        }

        const texture = this._getDisplayTexture(displayObject);
        if (!texture) {
            return null;
        }

        const material = new this.THREE.MeshBasicMaterial({
            map:         texture,
            transparent: false,
            alphaTest:   0.1
        });
        const mesh = new this.THREE.Mesh(this.wallTopFaceGeometry, material);
        mesh.rotation.x = -Math.PI / 2;
        this.wallTopFaceRoot.add(mesh);

        const entry = {
            mesh,
            material,
            textureKey: null,
            sourceAlpha: Number.isFinite(displayObject.alpha) ? displayObject.alpha : 1
        };
        this.wallTopFaceEntries.set(displayObject, entry);
        return entry;
    }

    _getOrCreateFloorFaceEntry(displayObject) {
        if (this.floorFaceEntries.has(displayObject)) {
            return this.floorFaceEntries.get(displayObject);
        }

        const texture = this._getDisplayTexture(displayObject);
        if (!texture) {
            return null;
        }

        const material = new this.THREE.MeshBasicMaterial({
            map:         texture,
            transparent: false,
            alphaTest:   0.1
        });
        const mesh = new this.THREE.Mesh(this.wallTopFaceGeometry, material);
        mesh.rotation.x = -Math.PI / 2;
        this.floorFaceRoot.add(mesh);

        const entry = {
            mesh,
            material,
            textureKey: null,
            sourceAlpha: Number.isFinite(displayObject.alpha) ? displayObject.alpha : 1
        };
        this.floorFaceEntries.set(displayObject, entry);
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
        const depthDisplayObject = displayObject.stpThreeDepthAnchor || displayObject;
        const depthTopLeft = depthDisplayObject.getTopLeft
            ? depthDisplayObject.getTopLeft()
            : { x: depthDisplayObject.x || 0, y: depthDisplayObject.y || 0 };
        const depthHeight = depthDisplayObject.displayHeight || depthDisplayObject.height || height;
        const renderOrderBias = displayObject.stpThreeRenderOrderBias || 0;

        entry.sprite.position.set(
            (topLeft.x + width / 2) / 25,
            0.04,
            (topLeft.y + height) / 25
        );
        entry.sprite.scale.set(width / 25, height / 25, 1);
        entry.sprite.visible = !!displayObject.visible;
        entry.sprite.renderOrder = this._depthRenderOrderFromWorldZ(
            (depthTopLeft.y + depthHeight) / 25,
            BILLBOARD_RENDER_LAYER
        ) + renderOrderBias;

        if (displayObject.setAlpha && displayObject.alpha !== 0) {
            displayObject.setAlpha(0);
        }
    }

    _syncFloorFaceEntry(entry, displayObject) {
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

        entry.mesh.position.set(
            (topLeft.x + width / 2) / 25,
            FLOOR_FACE_Y_OFFSET,
            (topLeft.y + height / 2) / 25
        );
        entry.mesh.scale.set(width / 25, height / 25, 1);
        entry.mesh.visible = !!displayObject.visible;
        entry.mesh.renderOrder = FLOOR_FACE_RENDER_LAYER;

        if (displayObject.setAlpha && displayObject.alpha !== 0) {
            displayObject.setAlpha(0);
        }
    }

    _syncWallTopFaceEntry(entry, displayObject) {
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

        entry.mesh.position.set(
            (topLeft.x + width / 2) / 25,
            WALL_HEIGHT + WALL_TOP_FACE_Y_OFFSET,
            (topLeft.y + height / 2) / 25
        );
        entry.mesh.scale.set(width / 25, height / 25, 1);
        entry.mesh.visible = !!displayObject.visible;
        entry.mesh.renderOrder = this._depthRenderOrderFromWorldZ(
            (topLeft.y + height) / 25,
            WALL_TOP_FACE_RENDER_LAYER
        );

        if (displayObject.setAlpha && displayObject.alpha !== 0) {
            displayObject.setAlpha(0);
        }
    }

    _getDisplayObjectRenderMode(displayObject) {
        if (!displayObject) {
            return 'billboard';
        }
        if (displayObject.stpThreeRenderMode === 'floorFace') {
            return 'floorFace';
        }
        return displayObject.stpThreeRenderMode === 'wallTopFace'
            ? 'wallTopFace'
            : 'billboard';
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
        for (const texture of Object.values(this.wallSideTextureCache)) {
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
        for (const material of Object.values(this.wallCornerSeamMaterialCache)) {
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
        for (const [displayObject, entry] of this.floorFaceEntries.entries()) {
            this._restoreSourceDisplayObject(entry, displayObject);
            if (entry.material && entry.material.dispose) {
                entry.material.dispose();
            }
        }
        for (const [displayObject, entry] of this.wallTopFaceEntries.entries()) {
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
        if (this.wallCornerSeamGeometry && this.wallCornerSeamGeometry.dispose) {
            this.wallCornerSeamGeometry.dispose();
        }
        if (this.wallTopFaceGeometry && this.wallTopFaceGeometry.dispose) {
            this.wallTopFaceGeometry.dispose();
        }
        this.tileTextureCache   = {};
        this.wallSideTextureCache = {};
        this.displayTextureCache = {};
        this.floorMaterialCache = {};
        this.wallMaterialCache  = {};
        this.wallCornerSeamMaterialCache = {};
        this.floorFaceEntries.clear();
        this.wallTopFaceEntries.clear();
        this.billboardEntries.clear();
    }

    _removeBillboardEntry(displayObject, entry) {
        this._restoreSourceDisplayObject(entry, displayObject);
        if (this.billboardRoot && entry && entry.sprite) {
            this.billboardRoot.remove(entry.sprite);
        }
        if (entry && entry.material && entry.material.dispose) {
            entry.material.dispose();
        }
        this.billboardEntries.delete(displayObject);
    }

    _removeWallTopFaceEntry(displayObject, entry) {
        this._restoreSourceDisplayObject(entry, displayObject);
        if (this.wallTopFaceRoot && entry && entry.mesh) {
            this.wallTopFaceRoot.remove(entry.mesh);
        }
        if (entry && entry.material && entry.material.dispose) {
            entry.material.dispose();
        }
        this.wallTopFaceEntries.delete(displayObject);
    }

    _removeFloorFaceEntry(displayObject, entry) {
        this._restoreSourceDisplayObject(entry, displayObject);
        if (this.floorFaceRoot && entry && entry.mesh) {
            this.floorFaceRoot.remove(entry.mesh);
        }
        if (entry && entry.material && entry.material.dispose) {
            entry.material.dispose();
        }
        this.floorFaceEntries.delete(displayObject);
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
