// LevelEditorScene.js — in-browser tile-map level editor
// Non-source addition; lives in src/editor/ beside the Java-faithful port.

import StpLevelFormat from './StpLevelFormat.js';

// ---------------------------------------------------------------------------
// Layout constants (canvas is always 625 × 625)
// ---------------------------------------------------------------------------
const TOP_H    = 32;                 // top bar (tabs + resize buttons)
const PAL_W    = 125;                // palette column (5 tiles × 25 px each)
const TILE_SZ  = 20;                 // each map tile displayed at 20 × 20 px
const MAP_X    = 0;
const MAP_Y    = TOP_H;              // 32
const MAP_W    = TILE_SZ * 25;       // 500
const MAP_H    = TILE_SZ * 25;       // 500
const BOT_Y    = MAP_Y + MAP_H;      // 532
const BOT_H    = 625 - BOT_Y;       // 93
const PAL_X    = MAP_W;              // 500
const PAL_TILE = 25;                 // palette tiles rendered at native 25 px
const PAL_COLS = PAL_W / PAL_TILE;   // 5
const PAL_LABEL_H = 14;
const PAL_GAP     = 8;

// Tilesets listed in palette order
const TILESETS = ['tileset1', 'guard1set', 'wizard1set'];
const TILESET_LABELS = { tileset1: 'TILES', guard1set: 'GUARDS', wizard1set: 'WIZARDS' };

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
const C_BG_MAP  = 0x1a1a1a;
const C_BG_PAL  = 0x0a0a0a;
const C_BG_BAR  = 0x222222;
const C_SEP     = 0x444444;
const C_GRID    = 0x333333;
const C_BTN     = 0x333333;
const C_BTN_ACT = 0x555500;
const C_BTN_HOV = 0x666600;
const C_TEXT    = '#cccccc';
const C_YELLOW  = '#ffff00';
const C_SEL     = 0xffff00;   // selected-palette tile outline
const C_CURSOR  = 0x00ff00;   // map hover-cursor outline

const RES = window.devicePixelRatio || 1;

function ts(size = 8, color = C_TEXT) {
    return { fontFamily: '"Press Start 2P"', fontSize: `${size}px`, color, resolution: RES };
}

// ---------------------------------------------------------------------------

export default class LevelEditorScene extends Phaser.Scene {

    constructor() {
        super({ key: 'LevelEditorScene' });
    }

    // -------------------------------------------------------------------------
    // Phaser lifecycle
    // -------------------------------------------------------------------------

    create() {
        // Mutable editor state
        this.levelData          = null;
        this.currentScreen      = { sx: 0, sy: 0 };
        this.currentTool        = 'paint';
        this.isPainting         = false;
        this.selectedPaletteKey = { tilesetName: 'tileset1', localId: 0 };
        this.paletteScrollY     = 0;
        this.paletteContentH    = 0;
        this.paletteDragState   = null;
        this.statusText         = null;
        this.fileInput          = null;
        this.rectDragStart      = null;
        this.showPointers       = true;
        this.pointerToggleButton = null;

        // UI object collections — populated by _build* methods
        this.tileImages    = [];   // [ty][tx] → Phaser.Image
        this.paletteEntries = [];  // { tilesetName, localId, img, bx, by }
        this.paletteLabels  = [];  // Phaser.Text labels for tileset sections
        this.screenTabs    = [];   // { bg, txt } for each screen tab
        this.toolButtons   = {};   // toolName → { bg, txt }

        this._addTilesetFrames();
        this._createEmptyTileTexture();
        this._buildBackground();
        this._buildTileCanvas();
        this._buildPalette();
        this._buildTopBar();
        this._buildBottomBar();
        this._buildCursorHighlight();
        this._buildRectPreview();
        this._setupKeyboard();
        this._createHiddenFileInput();

        // Accept a level passed via scene data (Phase 5: play custom level path),
        // or load level1 as a working default.
        const passedLevel = (this.scene.settings.data || {}).levelData;
        if (passedLevel) {
            this.levelData = passedLevel;
            this._onLevelLoaded();
        } else {
            this._loadDefaultLevel();
        }
    }

    // -------------------------------------------------------------------------
    // One-time setup helpers
    // -------------------------------------------------------------------------

    // Register per-tile frame windows on the three tileset textures.
    // Phaser allows adding named frames to an already-loaded Image texture.
    // Frame key = integer localId (0–24); tile is at col*25, row*25 in the 128×128 image.
    _addTilesetFrames() {
        for (const name of TILESETS) {
            for (const texKey of [name, this._pointerTextureKey(name)]) {
                const tex = this.textures.get(texKey);
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        const localId = row * 5 + col;
                        if (!tex.has(localId)) {
                            tex.add(localId, 0, col * 25, row * 25, 25, 25);
                        }
                    }
                }
            }
        }
    }

    // Small solid-colour texture used for empty (GID 0) tiles in the map canvas.
    _createEmptyTileTexture() {
        if (this.textures.exists('editor_empty')) return;
        const g = this.add.graphics();
        g.fillStyle(C_BG_MAP, 1);
        g.fillRect(0, 0, TILE_SZ, TILE_SZ);
        g.lineStyle(1, C_GRID, 0.6);
        g.strokeRect(0.5, 0.5, TILE_SZ - 1, TILE_SZ - 1);
        g.generateTexture('editor_empty', TILE_SZ, TILE_SZ);
        g.destroy();
    }

    // Static background panels and grid lines.
    _buildBackground() {
        this.add.rectangle(MAP_X,  MAP_Y, MAP_W,        MAP_H, C_BG_MAP).setOrigin(0, 0);
        this.add.rectangle(PAL_X,  0,     PAL_W,        625,   C_BG_PAL).setOrigin(0, 0);
        this.add.rectangle(0,      0,     625 - PAL_W,  TOP_H, C_BG_BAR).setOrigin(0, 0);
        this.add.rectangle(MAP_X,  BOT_Y, MAP_W,        BOT_H, C_BG_BAR).setOrigin(0, 0);

        // Tile-canvas grid
        const grid = this.add.graphics();
        grid.lineStyle(1, C_GRID, 0.35);
        for (let i = 0; i <= 25; i++) {
            grid.moveTo(MAP_X + i * TILE_SZ, MAP_Y);
            grid.lineTo(MAP_X + i * TILE_SZ, MAP_Y + MAP_H);
            grid.moveTo(MAP_X,               MAP_Y + i * TILE_SZ);
            grid.lineTo(MAP_X + MAP_W,        MAP_Y + i * TILE_SZ);
        }
        grid.strokePath();

        // Separator lines
        const sep = this.add.graphics();
        sep.lineStyle(1, C_SEP, 1);
        sep.moveTo(PAL_X, 0);     sep.lineTo(PAL_X,  625);   // vertical: map | palette
        sep.moveTo(0, TOP_H);     sep.lineTo(MAP_W,  TOP_H); // horizontal: bar | map
        sep.moveTo(0, BOT_Y);     sep.lineTo(MAP_W,  BOT_Y); // horizontal: map | bar
        sep.strokePath();
    }

    // One Image per tile cell (25 × 25 = 625 total) plus the pointer hit zone.
    _buildTileCanvas() {
        for (let ty = 0; ty < 25; ty++) {
            this.tileImages[ty] = [];
            for (let tx = 0; tx < 25; tx++) {
                this.tileImages[ty][tx] = this.add.image(
                    MAP_X + tx * TILE_SZ,
                    MAP_Y + ty * TILE_SZ,
                    'editor_empty'
                ).setOrigin(0, 0).setDisplaySize(TILE_SZ, TILE_SZ);
            }
        }

        // Transparent rectangle as the pointer hit zone over the tile canvas.
        // Non-interactive tile images mean pointer events fall through to this.
        const hitZone = this.add.rectangle(MAP_X, MAP_Y, MAP_W, MAP_H, 0, 0)
                            .setOrigin(0, 0)
                            .setInteractive();

        hitZone.on('pointerdown', (ptr) => {
            if (ptr.rightButtonDown && ptr.rightButtonDown()) {
                this._handleMapPickShortcut(ptr);
                return;
            }
            this.isPainting = true;
            this._handleMapPointer(ptr);
        });
        hitZone.on('pointermove', (ptr) => {
            this._updateCursorHighlight(ptr);
            if (this.isPainting) this._handleMapPointer(ptr);
        });
        hitZone.on('pointerup',  () => { this._finishMapPointerAction(); });
        hitZone.on('pointerout', () => {
            this._finishMapPointerAction();
            this.cursorHighlight.setVisible(false);
        });
        this.input.on('pointerup', () => this._finishMapPointerAction());
    }

    // Palette: tileset labels + 5 × 5 tile grids for all three tilesets.
    _buildPalette() {
        let py = TOP_H + 6;

        for (const tilesetName of TILESETS) {
            // Section label
            const labelObj = this.add.text(PAL_X + 4, py, TILESET_LABELS[tilesetName], ts(6))
                .setOrigin(0, 0);
            this.paletteLabels.push(labelObj);
            py += PAL_LABEL_H;

            // 5 × 5 tile grid
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const localId = row * 5 + col;
                    const bx      = PAL_X + col * PAL_TILE;
                    const by      = py  + row * PAL_TILE;
                    const img     = this.add.image(bx, by, this._editorTextureKey(tilesetName), localId)
                                        .setOrigin(0, 0)
                                        .setDisplaySize(PAL_TILE, PAL_TILE)
                                        .setInteractive({ useHandCursor: true });

                    const entry = { tilesetName, localId, img, bx, by };
                    this.paletteEntries.push(entry);

                    img.on('pointerdown', () => this._selectPaletteEntry(tilesetName, localId));
                }
            }
            py += PAL_TILE * 5 + PAL_GAP; // 5 rows of tiles + gap between tilesets
        }

        this.paletteContentH = py - TOP_H;

        this.input.on('pointerdown', (ptr) => {
            if (!this._isPointerInPalette(ptr)) return;
            this.paletteDragState = {
                startY: ptr.y,
                startScrollY: this.paletteScrollY,
                dragged: false
            };
        });
        this.input.on('pointermove', (ptr) => this._handlePalettePointerMove(ptr));
        this.input.on('pointerup',   () => this._endPaletteDrag());
        this.input.on('wheel', (ptr, gos, dx, dy) => {
            if (ptr.x >= PAL_X && ptr.x < 625 && ptr.y >= TOP_H && ptr.y < 625) {
                this._setPaletteScrollY(this.paletteScrollY + dy);
            }
        });

        // Yellow outline box drawn over the selected palette tile
        this.palSelBox = this.add.graphics();
        const palMaskG = this.make.graphics({ x: 0, y: 0, add: false });
        palMaskG.fillRect(PAL_X, TOP_H, PAL_W, 625 - TOP_H);
        const palMask = palMaskG.createGeometryMask();
        this.paletteLabels.forEach((labelObj) => labelObj.setMask(palMask));
        this.paletteEntries.forEach((entry) => entry.img.setMask(palMask));
        this.palSelBox.setMask(palMask);
        this._setPaletteScrollY(0);
        this._redrawPaletteSelection();
    }

    // Top bar: screen tabs (left) + grid-resize buttons (right).
    // Tabs are rebuilt dynamically when the level changes; resize buttons are stubs.
    _buildTopBar() {
        this.screenTabs = [];

        const resizeDefs = [
            { label: '+col', fn: () => this._resizeGrid( 1,  0) },
            { label: '-col', fn: () => this._resizeGrid(-1,  0) },
            { label: '+row', fn: () => this._resizeGrid( 0,  1) },
            { label: '-row', fn: () => this._resizeGrid( 0, -1) },
        ];
        const rBtnW = 43, rBtnGap = 2;
        const rStartX = MAP_W - resizeDefs.length * (rBtnW + rBtnGap) - 2;
        resizeDefs.forEach(({ label, fn }, i) => {
            this._makeButton(
                rStartX + i * (rBtnW + rBtnGap), 2, rBtnW, TOP_H - 4,
                label, 6,
                fn
            );
        });
    }

    // Bottom bar: tool buttons (row 1) + action buttons (row 2).
    _buildBottomBar() {
        // Row 1 — tool selector (5 equal-width buttons across MAP_W)
        const toolDefs = [
            { key: 'paint', label: 'PAINT' },
            { key: 'erase', label: 'ERASE' },
            { key: 'fill',  label: 'FILL'  },
            { key: 'rect',  label: 'RECT'  },
            { key: 'pick',  label: 'PICK'  },
        ];
        const tBtnW = 99, tBtnGap = 1, tRow = BOT_Y + 8;
        toolDefs.forEach(({ key, label }, i) => {
            const btn = this._makeButton(
                i * (tBtnW + tBtnGap), tRow, tBtnW, 26,
                label, 7,
                () => this._selectTool(key)
            );
            this.toolButtons[key] = btn;
        });

        // Row 2 — actions
        const actDefs = [
            { label: 'SAVE', fn: () => this._actionSave() },
            { label: 'LOAD', fn: () => this._actionLoad() },
            { label: 'IMPORT', fn: () => this._actionImportExisting() },
            { label: 'NEW',  fn: () => this._actionNew()  },
            { label: 'PTR:ON', fn: () => this._togglePointers() },
            { label: 'MENU', fn: () => this._actionBack() },
        ];
        const aBtnW = 82, aBtnGap = 1, aRow = BOT_Y + 46;
        actDefs.forEach(({ label, fn }, i) => {
            const btn = this._makeButton(i * (aBtnW + aBtnGap), aRow, aBtnW, 26, label, 7, fn);
            if (label === 'PTR:ON') {
                this.pointerToggleButton = btn;
            }
        });

        this.statusText = this.add.text(6, BOT_Y + 78, '', ts(6, C_YELLOW)).setOrigin(0, 0);
        this._setStatus('Ready.');

        this._updateToolButtonHighlight();
        this._updatePointerToggleButton();
    }

    // A green outline box that follows the pointer tile on the map canvas.
    _buildCursorHighlight() {
        this.cursorHighlight = this.add.graphics();
        this.cursorHighlight.lineStyle(2, C_CURSOR, 0.85);
        this.cursorHighlight.strokeRect(1, 1, TILE_SZ - 2, TILE_SZ - 2);
        this.cursorHighlight.setVisible(false);
    }

    _buildRectPreview() {
        this.rectPreview = this.add.graphics();
        this.rectPreview.setVisible(false);
    }

    // Keyboard shortcuts: ESC back, B/E/F/R/I tools, arrow-key screen pan,
    // Ctrl+S save.
    _setupKeyboard() {
        this.input.mouse.disableContextMenu();
        this.input.keyboard.on('keydown-ESC', () => this._actionBack());

        this.input.keyboard.on('keydown-B', () => this._selectTool('paint'));
        this.input.keyboard.on('keydown-E', () => this._selectTool('erase'));
        this.input.keyboard.on('keydown-F', () => this._selectTool('fill'));
        this.input.keyboard.on('keydown-R', () => this._selectTool('rect'));
        this.input.keyboard.on('keydown-I', () => this._selectTool('pick'));
        this.input.keyboard.on('keydown-P', () => this._togglePointers());

        this.input.keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._actionSave();
            }
        });

        // Arrow keys navigate between screens
        this.input.keyboard.on('keydown-LEFT',  () => this._panScreen(-1,  0));
        this.input.keyboard.on('keydown-RIGHT', () => this._panScreen( 1,  0));
        this.input.keyboard.on('keydown-UP',    () => this._panScreen( 0, -1));
        this.input.keyboard.on('keydown-DOWN',  () => this._panScreen( 0,  1));
    }

    // -------------------------------------------------------------------------
    // Level loading
    // -------------------------------------------------------------------------

    _loadDefaultLevel() {
        fetch('data/stplevels/level1.stplevel.json')
            .then(r => r.text())
            .then(text => {
                this.levelData = StpLevelFormat.fromJsonString(text);
                this._onLevelLoaded();
            })
            .catch(err => {
                console.warn('LevelEditorScene: could not load default level, using blank.', err);
                this.levelData = this._makeBlankLevel();
                this._onLevelLoaded();
            });
    }

    _makeBlankLevel() {
        return {
            format: 'stplevel', version: 1,
            name: 'untitled', mapsong: 'main1',
            screensX: 1, screensY: 1, spawnScreen: [0, 0],
            screens: [{
                sx: 0, sy: 0, width: 25, height: 25,
                tilesets: [
                    { name: 'tileset1',   firstgid: 1  },
                    { name: 'guard1set',  firstgid: 26 },
                    { name: 'wizard1set', firstgid: 51 },
                ],
                tiles:     new Array(625).fill(0),
                tileProps: {}
            }]
        };
    }

    _onLevelLoaded() {
        this.currentScreen = { sx: 0, sy: 0 };
        this._rebuildScreenTabs();
        this._redrawTileCanvas();
        this._setStatus(`Loaded ${this.levelData.name || 'untitled'}.`);
    }

    // -------------------------------------------------------------------------
    // Screen management
    // -------------------------------------------------------------------------

    _currentScreenData() {
        const { sx, sy } = this.currentScreen;
        return this.levelData.screens.find(s => s.sx === sx && s.sy === sy) || null;
    }

    _switchToScreen(sx, sy) {
        this.currentScreen = { sx, sy };
        this._rebuildScreenTabs();
        this._redrawTileCanvas();
    }

    _panScreen(dsx, dsy) {
        if (!this.levelData) return;
        const nx = this.currentScreen.sx + dsx;
        const ny = this.currentScreen.sy + dsy;
        if (nx < 0 || nx >= this.levelData.screensX) return;
        if (ny < 0 || ny >= this.levelData.screensY) return;
        this._switchToScreen(nx, ny);
    }

    _rebuildScreenTabs() {
        this.screenTabs.forEach(t => { t.bg.destroy(); t.txt.destroy(); });
        this.screenTabs = [];

        let tx = 4;
        const { screensX, screensY } = this.levelData;
        for (let sy = 0; sy < screensY; sy++) {
            for (let sx = 0; sx < screensX; sx++) {
                const label    = `(${sx},${sy})`;
                const isActive = (sx === this.currentScreen.sx && sy === this.currentScreen.sy);
                const tabW     = label.length * 8 + 10;

                const bg = this.add.rectangle(tx, 2, tabW, TOP_H - 4,
                               isActive ? C_BTN_ACT : C_BTN, 1)
                               .setOrigin(0, 0)
                               .setInteractive({ useHandCursor: true });

                const txt = this.add.text(tx + tabW / 2, TOP_H / 2, label, ts(7, isActive ? C_YELLOW : C_TEXT))
                                .setOrigin(0.5, 0.5);

                const capSx = sx, capSy = sy;
                bg.on('pointerover', () => { bg.setFillStyle(C_BTN_HOV); });
                bg.on('pointerout',  () => { bg.setFillStyle(isActive ? C_BTN_ACT : C_BTN); });
                bg.on('pointerdown', () => this._switchToScreen(capSx, capSy));

                this.screenTabs.push({ bg, txt });
                tx += tabW + 3;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Tile canvas rendering
    // -------------------------------------------------------------------------

    _redrawTileCanvas() {
        const screen = this._currentScreenData();
        if (!screen) return;
        for (let ty = 0; ty < 25; ty++) {
            for (let tx = 0; tx < 25; tx++) {
                this._redrawTile(tx, ty, screen);
            }
        }
    }

    _redrawTile(tx, ty, screen) {
        if (!screen) screen = this._currentScreenData();
        const gid = screen.tiles[ty * screen.width + tx];
        const img = this.tileImages[ty][tx];
        if (!gid) {
            img.setTexture('editor_empty').setDisplaySize(TILE_SZ, TILE_SZ);
            return;
        }
        const tsData = this._tilesetForGid(gid, screen.tilesets);
        if (!tsData) {
            img.setTexture('editor_empty').setDisplaySize(TILE_SZ, TILE_SZ);
            return;
        }
        img.setTexture(this._editorTextureKey(tsData.name), gid - tsData.firstgid).setDisplaySize(TILE_SZ, TILE_SZ);
    }

    // Return the tileset entry whose firstgid range contains the given GID.
    _tilesetForGid(gid, tilesets) {
        let best = null;
        for (const ts of tilesets) {
            if (gid >= ts.firstgid && (!best || ts.firstgid > best.firstgid)) best = ts;
        }
        return best;
    }

    // -------------------------------------------------------------------------
    // Palette
    // -------------------------------------------------------------------------

    _selectPaletteEntry(tilesetName, localId) {
        this.selectedPaletteKey = { tilesetName, localId };
        this._redrawPaletteSelection();
    }

    _setPaletteScrollY(scrollY) {
        const maxScroll = Math.max(0, this.paletteContentH - (625 - TOP_H));
        const clamped   = Phaser.Math.Clamp(scrollY, 0, maxScroll);
        this.paletteScrollY = clamped;

        this.paletteLabels.forEach((labelObj, index) => {
            const baseY = TOP_H + 6 + index * (PAL_LABEL_H + PAL_TILE * 5 + PAL_GAP);
            labelObj.setY(baseY - clamped);
        });
        this.paletteEntries.forEach((entry) => {
            entry.img.setY(entry.by - clamped);
        });
        this._redrawPaletteSelection();
    }

    _refreshPaletteTextures() {
        this.paletteEntries.forEach((entry) => {
            entry.img.setTexture(this._editorTextureKey(entry.tilesetName), entry.localId);
        });
    }

    _handlePalettePointerMove(ptr) {
        if (!this.paletteDragState) return;
        if (!ptr.isDown) {
            this._endPaletteDrag();
            return;
        }
        const dy = ptr.y - this.paletteDragState.startY;
        if (Math.abs(dy) >= 3) this.paletteDragState.dragged = true;
        this._setPaletteScrollY(this.paletteDragState.startScrollY - dy);
    }

    _endPaletteDrag() {
        this.paletteDragState = null;
    }

    _isPointerInPalette(ptr) {
        return ptr.x >= PAL_X && ptr.x < 625 && ptr.y >= TOP_H && ptr.y < 625;
    }

    _redrawPaletteSelection() {
        this.palSelBox.clear();
        const entry = this.paletteEntries.find(
            e => e.tilesetName === this.selectedPaletteKey.tilesetName &&
                 e.localId     === this.selectedPaletteKey.localId
        );
        if (!entry) return;
        this.palSelBox.lineStyle(2, C_SEL, 1);
        this.palSelBox.strokeRect(entry.bx, entry.by - this.paletteScrollY, PAL_TILE, PAL_TILE);
    }

    // Compute the GID for the currently selected palette tile on the current screen.
    _selectedGid() {
        const screen = this._currentScreenData();
        if (!screen) return 0;
        const { tilesetName, localId } = this.selectedPaletteKey;
        const tsEntry = screen.tilesets.find(t => t.name === tilesetName);
        return tsEntry ? tsEntry.firstgid + localId : 0;
    }

    // -------------------------------------------------------------------------
    // Map pointer handling
    // -------------------------------------------------------------------------

    _pointerToTile(ptr) {
        return {
            tx: Math.floor((ptr.x - MAP_X) / TILE_SZ),
            ty: Math.floor((ptr.y - MAP_Y) / TILE_SZ)
        };
    }

    _handleMapPointer(ptr) {
        const { tx, ty } = this._pointerToTile(ptr);
        if (tx < 0 || tx >= 25 || ty < 0 || ty >= 25) return;
        if      (this.currentTool === 'paint') this._doPaint(tx, ty);
        else if (this.currentTool === 'erase') this._doErase(tx, ty);
        else if (this.currentTool === 'pick')  this._doPick(tx, ty);
        else if (this.currentTool === 'fill')  this._doFill(tx, ty);
        else if (this.currentTool === 'rect')  this._doRectDrag(tx, ty);
    }

    _updateCursorHighlight(ptr) {
        const { tx, ty } = this._pointerToTile(ptr);
        if (tx < 0 || tx >= 25 || ty < 0 || ty >= 25) {
            this.cursorHighlight.setVisible(false);
            return;
        }
        this.cursorHighlight
            .setPosition(MAP_X + tx * TILE_SZ, MAP_Y + ty * TILE_SZ)
            .setVisible(true);
    }

    _doPaint(tx, ty) {
        const screen = this._currentScreenData();
        const gid    = this._selectedGid();
        const idx    = ty * screen.width + tx;
        if (screen.tiles[idx] === gid) return;
        screen.tiles[idx] = gid;
        this._redrawTile(tx, ty, screen);
    }

    _doErase(tx, ty) {
        const screen = this._currentScreenData();
        const idx    = ty * screen.width + tx;
        if (screen.tiles[idx] === 0) return;
        screen.tiles[idx] = 0;
        this._redrawTile(tx, ty, screen);
    }

    _doPick(tx, ty) {
        const screen = this._currentScreenData();
        const gid    = screen.tiles[ty * screen.width + tx];
        if (!gid) return;
        const tsData = this._tilesetForGid(gid, screen.tilesets);
        if (!tsData) return;
        this._selectPaletteEntry(tsData.name, gid - tsData.firstgid);
        this._selectTool('paint'); // auto-switch to paint after picking
    }

    _doFill(tx, ty) {
        const screen = this._currentScreenData();
        const idx    = ty * screen.width + tx;
        const fromGid = screen.tiles[idx];
        const toGid   = this._selectedGid();
        if (fromGid === toGid) return;

        const queue = [[tx, ty]];
        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            if (cx < 0 || cx >= screen.width || cy < 0 || cy >= screen.height) continue;
            const curIdx = cy * screen.width + cx;
            if (screen.tiles[curIdx] !== fromGid) continue;

            screen.tiles[curIdx] = toGid;
            this._redrawTile(cx, cy, screen);

            queue.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
        }

        this.isPainting = false;
    }

    _doRectDrag(tx, ty) {
        if (!this.rectDragStart) {
            this.rectDragStart = { tx, ty };
        }
        this._drawRectPreview(this.rectDragStart.tx, this.rectDragStart.ty, tx, ty);
    }

    _handleMapPickShortcut(ptr) {
        const { tx, ty } = this._pointerToTile(ptr);
        if (tx < 0 || tx >= 25 || ty < 0 || ty >= 25) return;
        this._doPick(tx, ty);
    }

    _finishMapPointerAction() {
        this.isPainting = false;

        if (!this.rectDragStart) return;

        const end = this._cursorTileFromPreview();
        if (end) {
            this._applyRect(this.rectDragStart.tx, this.rectDragStart.ty, end.tx, end.ty);
        }
        this.rectDragStart = null;
        this.rectPreview.clear();
        this.rectPreview.setVisible(false);
    }

    _drawRectPreview(tx1, ty1, tx2, ty2) {
        const minX = Math.min(tx1, tx2);
        const minY = Math.min(ty1, ty2);
        const maxX = Math.max(tx1, tx2);
        const maxY = Math.max(ty1, ty2);

        this.rectPreview.clear();
        this.rectPreview.lineStyle(2, C_SEL, 0.9);
        this.rectPreview.strokeRect(
            MAP_X + minX * TILE_SZ + 1,
            MAP_Y + minY * TILE_SZ + 1,
            (maxX - minX + 1) * TILE_SZ - 2,
            (maxY - minY + 1) * TILE_SZ - 2
        );
        this.rectPreview.setVisible(true);
        this.rectPreview._lastRect = { tx: tx2, ty: ty2 };
    }

    _cursorTileFromPreview() {
        return this.rectPreview && this.rectPreview._lastRect ? this.rectPreview._lastRect : null;
    }

    _applyRect(tx1, ty1, tx2, ty2) {
        const screen = this._currentScreenData();
        const gid    = this._selectedGid();
        const minX = Math.min(tx1, tx2);
        const minY = Math.min(ty1, ty2);
        const maxX = Math.max(tx1, tx2);
        const maxY = Math.max(ty1, ty2);

        for (let ty = minY; ty <= maxY; ty++) {
            for (let tx = minX; tx <= maxX; tx++) {
                const idx = ty * screen.width + tx;
                screen.tiles[idx] = gid;
                this._redrawTile(tx, ty, screen);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Tool selection
    // -------------------------------------------------------------------------

    _selectTool(toolName) {
        this.currentTool = toolName;
        this._updateToolButtonHighlight();
    }

    _updateToolButtonHighlight() {
        for (const [key, btn] of Object.entries(this.toolButtons)) {
            const active = (key === this.currentTool);
            const color  = active ? C_BTN_ACT : C_BTN;
            btn.bg.setFillStyle(color);
            btn.bg._baseColor = color;
            btn.txt.setColor(active ? C_YELLOW : C_TEXT);
        }
    }

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    _actionSave() {
        if (!this.levelData) return;
        const json = StpLevelFormat.toJsonString(this.levelData);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = (this.levelData.name || 'level').replace(/\s+/g, '_') + '.stplevel.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this._setStatus(`Saved ${a.download}.`);
    }

    _actionLoad() {
        if (!this.fileInput) return;
        this.fileInput.value = '';
        this.fileInput.click();
    }

    _actionImportExisting() {
        this._showImportMenu();
    }

    _actionNew() {
        this.levelData = this._makeBlankLevel();
        this._onLevelLoaded();
        this._setStatus('Created blank level.');
    }

    _actionBack() {
        this.scene.start('MenuScene', { playIntro: false });
    }

    _togglePointers() {
        this.showPointers = !this.showPointers;
        this._refreshPaletteTextures();
        this._redrawTileCanvas();
        this._updatePointerToggleButton();
        this._setStatus(this.showPointers ? 'Pointer tiles enabled.' : 'Pointer tiles hidden.');
    }

    // -------------------------------------------------------------------------
    // Button factory
    // -------------------------------------------------------------------------

    _resizeGrid(dx, dy) {
        if (!this.levelData) return;

        const newScreensX = this.levelData.screensX + dx;
        const newScreensY = this.levelData.screensY + dy;
        if (newScreensX < 1 || newScreensY < 1) {
            this._setStatus('Grid cannot be smaller than 1x1.');
            return;
        }

        const newScreens = [];
        for (let sy = 0; sy < newScreensY; sy++) {
            for (let sx = 0; sx < newScreensX; sx++) {
                const existing = this.levelData.screens.find((screen) => screen.sx === sx && screen.sy === sy);
                newScreens.push(existing || this._makeBlankScreen(sx, sy));
            }
        }

        this.levelData.screensX = newScreensX;
        this.levelData.screensY = newScreensY;
        this.levelData.screens  = newScreens;

        if (this.currentScreen.sx >= newScreensX) this.currentScreen.sx = newScreensX - 1;
        if (this.currentScreen.sy >= newScreensY) this.currentScreen.sy = newScreensY - 1;

        this._rebuildScreenTabs();
        this._redrawTileCanvas();
        this._setStatus(`Grid resized to ${newScreensX}x${newScreensY}.`);
    }

    _makeBlankScreen(sx, sy) {
        return {
            sx, sy,
            width: 25,
            height: 25,
            tilesets: [
                { name: 'tileset1',   firstgid: 1  },
                { name: 'guard1set',  firstgid: 26 },
                { name: 'wizard1set', firstgid: 51 },
            ],
            tiles: new Array(625).fill(0),
            tileProps: {}
        };
    }

    _createHiddenFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json,.stplevel.json';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', () => this._handleFileChosen());
        document.body.appendChild(this.fileInput);
        this.events.once('shutdown', () => {
            if (this.fileInput && this.fileInput.parentNode) {
                this.fileInput.parentNode.removeChild(this.fileInput);
            }
            this.fileInput = null;
        });
    }

    _handleFileChosen() {
        const file = this.fileInput && this.fileInput.files && this.fileInput.files[0];
        if (!file) return;

        file.text()
            .then((text) => {
                this.levelData = StpLevelFormat.fromJsonString(text);
                this._onLevelLoaded();
                this._setStatus(`Loaded ${file.name}.`);
            })
            .catch((err) => {
                console.warn('LevelEditorScene: could not load selected file.', err);
                this._setStatus('Load failed. Check console for details.');
            });
    }

    _showImportMenu() {
        const bg = this.add.rectangle(76, 136, 348, 250, 0x000000, 0.94).setOrigin(0, 0);
        bg.setStrokeStyle(2, C_SEL, 1);

        const title = this.add.text(250, 154, 'IMPORT DEFAULT LEVEL', ts(7, C_YELLOW)).setOrigin(0.5, 0);
        const buttons = [];

        const buttonDefs = [
            { label: 'LEVEL 1', path: 'data/stplevels/level1.stplevel.json' },
            { label: 'LEVEL 2', path: 'data/stplevels/level2.stplevel.json' },
            { label: 'LEVEL 3', path: 'data/stplevels/level3.stplevel.json' },
            { label: 'LEVEL 4', path: 'data/stplevels/level4.stplevel.json' },
            { label: 'LEVEL 5', path: 'data/stplevels/level5.stplevel.json' },
            { label: 'LEVEL 6', path: 'data/stplevels/level6.stplevel.json' },
            { label: 'CANCEL',  path: null }
        ];

        buttonDefs.forEach((def, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const btn = this._makeButton(
                94 + col * 122,
                186 + row * 44,
                110,
                28,
                def.label,
                7,
                () => {
                    closeMenu();
                    if (def.path) this._importBundledLevel(def.path, def.label);
                }
            );
            buttons.push(btn);
        });

        const closeMenu = () => {
            bg.destroy();
            title.destroy();
            buttons.forEach((btn) => {
                btn.bg.destroy();
                btn.txt.destroy();
            });
        };
    }

    _importBundledLevel(path, label) {
        fetch(path)
            .then((response) => response.text())
            .then((text) => {
                this.levelData = StpLevelFormat.fromJsonString(text);
                this._onLevelLoaded();
                this._setStatus(`Imported ${label}.`);
            })
            .catch((err) => {
                console.warn('LevelEditorScene: could not import bundled level.', err);
                this._setStatus('Import failed. Check console for details.');
            });
    }

    _setStatus(message) {
        if (this.statusText) {
            this.statusText.setText(message);
        }
    }

    _updatePointerToggleButton() {
        if (!this.pointerToggleButton) return;
        const active = this.showPointers;
        this.pointerToggleButton.txt.setText(active ? 'PTR:ON' : 'PTR:OFF');
        this.pointerToggleButton.bg._baseColor = active ? C_BTN_ACT : C_BTN;
        this.pointerToggleButton.bg.setFillStyle(this.pointerToggleButton.bg._baseColor);
        this.pointerToggleButton.txt.setColor(active ? C_YELLOW : C_TEXT);
    }

    _pointerTextureKey(tilesetName) {
        return tilesetName + '_pointers';
    }

    _editorTextureKey(tilesetName) {
        return this.showPointers ? this._pointerTextureKey(tilesetName) : tilesetName;
    }

    // Create a rectangle-backed button; returns { bg, txt } for later style updates.
    // Text is non-interactive so pointer events fall through to the bg hit area.
    _makeButton(x, y, w, h, label, fontSize, onPress) {
        const bg = this.add.rectangle(x, y, w, h, C_BTN, 1)
                       .setOrigin(0, 0)
                       .setInteractive({ useHandCursor: true });
        const txt = this.add.text(x + w / 2, y + h / 2, label, ts(fontSize))
                       .setOrigin(0.5, 0.5);

        bg._baseColor = C_BTN;
        bg.on('pointerover', () => { bg.setFillStyle(C_BTN_HOV); });
        bg.on('pointerout',  () => { bg.setFillStyle(bg._baseColor); });
        bg.on('pointerdown', onPress);

        return { bg, txt };
    }
}
