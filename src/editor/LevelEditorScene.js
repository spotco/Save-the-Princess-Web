// LevelEditorScene.js — in-browser tile-map level editor
// Non-source addition; lives in src/editor/ beside the Java-faithful port.

import StpLevelFormat from './StpLevelFormat.js';
import ControlsInfo   from '../ControlsInfo.js';
import RenderModeManager from '../RenderModeManager.js';

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

// Tilesets listed in palette order, with canonical firstgid assignments.
// All screens are normalized to include all three entries so any tileset
// can be painted on any screen regardless of what was stored in the file.
const CANONICAL_TILESETS = [
    { name: 'tileset1',   firstgid: 1  },
    { name: 'guard1set',  firstgid: 26 },
    { name: 'wizard1set', firstgid: 51 },
];
const TILESETS        = CANONICAL_TILESETS.map(t => t.name);
const TILESET_LABELS  = { tileset1: 'TILES', guard1set: 'GUARDS', wizard1set: 'WIZARDS' };

// Per-tile pointer labels shown as a Phaser text overlay when showPointers=true.
// Keys are localId (0-based within each tileset sheet).
// Color matches semantic category: orange=dog, red=guard spawn, orange=guard point,
// cyan=door, yellow=exit, gold=key, green=player, pink=princess, tan=crate,
// blue=save point, purple=wizard, red=boss, blue=tracker.
const POINTER_LABELS = {
    tileset1: {
        3:  { text: '\u2190D', color: '#ff8800' },   // dog left
        7:  { text: 'D\u2192', color: '#ff8800' },   // dog right
        10: { text: 'D\u2193', color: '#ff8800' },   // dog down
        11: { text: 'D\u2191', color: '#ff8800' },   // dog up
        16: { text: 'PR',      color: '#ff88ff' },   // princess
        20: { text: 'PL',      color: '#88ff00' },   // player spawn
        22: { text: 'CR',      color: '#ccaa77' },   // crate spawn
        24: { text: 'SV',      color: '#44ccff' },   // save point
    },
    guard1set: {
        0:  { text: 'G\u2192', color: '#ff4444' },   // guardspawn right
        1:  { text: 'G\u2191', color: '#ff4444' },   // guardspawn up
        2:  { text: 'P\u2192', color: '#ff8800' },   // guardpoint right
        3:  { text: '\u2190P', color: '#ff8800' },   // guardpoint left
        4:  { text: 'DC',      color: '#44ffff' },   // door closed
        5:  { text: 'G\u2193', color: '#ff4444' },   // guardspawn down
        6:  { text: '\u2190G', color: '#ff4444' },   // guardspawn left
        7:  { text: 'P\u2193', color: '#ff8800' },   // guardpoint down
        8:  { text: 'P\u2191', color: '#ff8800' },   // guardpoint up
        9:  { text: 'DO',      color: '#44ffff' },   // door open
        10: { text: 'DB',      color: '#44ffff' },   // doorbutton
        13: { text: 'E\u2192', color: '#ffff00' },   // exit right
        14: { text: '\u2190E', color: '#ffff00' },   // exit left
        15: { text: 'S\u2192', color: '#ff8800' },   // guardpoint+stop right
        16: { text: '\u2190S', color: '#ff8800' },   // guardpoint+stop left
        17: { text: 'KY',      color: '#ffdd00' },   // key
        18: { text: 'E\u2191', color: '#ffff00' },   // exit up
        20: { text: 'S\u2193', color: '#ff8800' },   // guardpoint+stop down
        21: { text: 'S\u2191', color: '#ff8800' },   // guardpoint+stop up
        22: { text: 'KD',      color: '#ffdd00' },   // keydoor
        23: { text: 'E\u2193', color: '#ffff00' },   // exit down
    },
    wizard1set: {
        0:  { text: 'W\u2191', color: '#cc88ff' },   // wizard up
        4:  { text: 'KB',      color: '#ff4444' },   // knightboss
        5:  { text: 'W\u2192', color: '#cc88ff' },   // wizard right
        10: { text: 'W\u2193', color: '#cc88ff' },   // wizard down
        15: { text: '\u2190W', color: '#cc88ff' },   // wizard left
        16: { text: 'KS',      color: '#ff4444' },   // knightboss delay spawn
        20: { text: 'TR',      color: '#4488ff' },   // tracker
        21: { text: 'BA',      color: '#ff4444' },   // bossactivate
        22: { text: 'BS',      color: '#ff4444' },   // bossactivatespawn
    },
};

// Human-readable name for every tile in each tileset, used by the info bar.
const TILE_NAMES = {
    tileset1: {
        0:  'Wall (dark fill)',
        1:  'Corner top-left',
        2:  'Corner bottom-right',
        3:  'Dog spawn \u2190',
        4:  'Floor',
        5:  'Corner top-right',
        6:  'Corner bottom-left',
        7:  'Dog spawn \u2192',
        8:  'Wall with gem',
        9:  'Torch',
        10: 'Dog spawn \u2193',
        11: 'Dog spawn \u2191',
        12: 'Wall with lantern',
        13: 'Wall (top-lit cap)',
        14: 'Wall vertical',
        15: 'Floor',
        16: 'Princess spawn',
        17: 'Wall (left-lit cap)',
        18: 'Wall horizontal',
        19: 'Wall (black fill)',
        20: 'Player spawn',
        21: 'Wall (bottom-lit cap)',
        22: 'Crate spawn',
        23: 'Wall (right-lit cap)',
        24: 'Save point',
    },
    guard1set: {
        0:  'Guard spawn \u2192',   1:  'Guard spawn \u2191',   2:  'Guard point \u2192',
        3:  'Guard point \u2190',   4:  'Door (closed)',         5:  'Guard spawn \u2193',
        6:  'Guard spawn \u2190',   7:  'Guard point \u2193',   8:  'Guard point \u2191',
        9:  'Door (open)',          10: 'Door button',           11: 'Wall',
        12: 'Window',              13: 'Exit \u2192',           14: 'Exit \u2190',
        15: 'Guard stop \u2192',   16: 'Guard stop \u2190',    17: 'Key',
        18: 'Exit \u2191',         19: 'Wall',                  20: 'Guard stop \u2193',
        21: 'Guard stop \u2191',   22: 'Key door',              23: 'Exit \u2193',
        24: 'Wall',
    },
    wizard1set: {
        0:  'Wizard spawn \u2191',      1:  'Wall',   2:  'Wall',   3:  'Wall',
        4:  'Knight boss',              5:  'Wizard spawn \u2192',  6:  'Wall',
        7:  'Wall',                     8:  'Wall',   9:  'Wall',
        10: 'Wizard spawn \u2193',      11: 'Wall',   12: 'Wall',   13: 'Wall',
        14: 'Wall',                     15: 'Wizard spawn \u2190',
        16: 'Knight boss delay spawn',  17: 'Wall',   18: 'Wall',   19: 'Wall',
        20: 'Tracker',                  21: 'Boss activate',
        22: 'Boss activate spawn',      23: 'Wall',   24: 'Wall',
    },
};

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

let preservedEditorSession = null;

// ---------------------------------------------------------------------------

export default class LevelEditorScene extends Phaser.Scene {

    constructor() {
        super({ key: 'LevelEditorScene' });
    }

    // -------------------------------------------------------------------------
    // Phaser lifecycle
    // -------------------------------------------------------------------------

    create() {
        this.renderMode = RenderModeManager.applySceneMode('LevelEditorScene');

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
        this.undoButton         = null;
        this.redoButton         = null;
        this.palHoverBox        = null;
        this.undoStack          = [];
        this.redoStack          = [];
        this._strokeSnapshot    = null;

        // UI object collections — populated by _build* methods
        this.tileImages        = [];   // [ty][tx] → Phaser.Image
        this.tilePointerLabels = [];   // [ty][tx] → Phaser.Text overlay (pointer annotations)
        this.paletteEntries    = [];   // { tilesetName, localId, img, bx, by, labelTxt }
        this.paletteLabels     = [];   // Phaser.Text labels for tileset sections
        this.screenTabs    = [];   // { bg, txt } for each screen tab
        this.toolButtons   = {};   // toolName → { bg, txt }

        // Virtual controls must not appear while the editor is active.
        const vcOverlay = document.getElementById('virtual-controls');
        if (vcOverlay) vcOverlay.style.display = 'none';
        ControlsInfo.setMode('keyboard');

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
        this.events.once('shutdown', () => this._saveEditorSession());

        // Accept a level passed via scene data (Phase 5: play custom level path),
        // restore the current editor session after a menu round-trip, or load
        // level1 as a working default.
        const sceneData   = this.scene.settings.data || {};
        const passedSession = sceneData.editorSession || null;
        const passedLevel   = sceneData.levelData;
        if (passedSession) {
            this._restoreEditorSession(passedSession);
        } else if (passedLevel) {
            this._restoreEditorSession({
                levelData:          passedLevel,
                undoStack:          sceneData.editorUndoStack || [],
                redoStack:          sceneData.editorRedoStack || [],
                currentScreen:      sceneData.editorCurrentScreen || { sx: 0, sy: 0 },
                currentTool:        sceneData.editorCurrentTool || 'paint',
                selectedPaletteKey: sceneData.editorSelectedPaletteKey || { tilesetName: 'tileset1', localId: 0 },
                paletteScrollY:     sceneData.editorPaletteScrollY || 0,
                showPointers:       sceneData.editorShowPointers !== false,
            });
        } else if (preservedEditorSession) {
            this._restoreEditorSession(preservedEditorSession);
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
            const tex = this.textures.get(name);
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

    // One Image per tile cell (25 × 25 = 625 total) plus pointer label texts and hit zone.
    _buildTileCanvas() {
        for (let ty = 0; ty < 25; ty++) {
            this.tileImages[ty]        = [];
            this.tilePointerLabels[ty] = [];
            for (let tx = 0; tx < 25; tx++) {
                this.tileImages[ty][tx] = this.add.image(
                    MAP_X + tx * TILE_SZ,
                    MAP_Y + ty * TILE_SZ,
                    'editor_empty'
                ).setOrigin(0, 0).setDisplaySize(TILE_SZ, TILE_SZ);

                this.tilePointerLabels[ty][tx] = this.add.text(
                    MAP_X + tx * TILE_SZ + TILE_SZ / 2,
                    MAP_Y + ty * TILE_SZ + TILE_SZ / 2,
                    '',
                    { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '12px', color: '#ffffff',
                      stroke: '#000000', strokeThickness: 3, resolution: RES }
                ).setOrigin(0.5, 0.5).setVisible(false);
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
            this._beginStroke();
            this.isPainting = true;
            this._handleMapPointer(ptr);
            const { tx, ty } = this._pointerToTile(ptr);
            this._showTileInfo(tx, ty);
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
                    const img     = this.add.image(bx, by, tilesetName, localId)
                                        .setOrigin(0, 0)
                                        .setDisplaySize(PAL_TILE, PAL_TILE)
                                        .setInteractive({ useHandCursor: true });

                    const pointerLabel = this._pointerLabelForTile(tilesetName, localId);
                    const labelTxt = pointerLabel
                        ? this.add.text(
                            bx + PAL_TILE / 2,
                            by + PAL_TILE / 2,
                            pointerLabel.text,
                            { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '15px', color: pointerLabel.color,
                              stroke: '#000000', strokeThickness: 3, resolution: RES }
                          ).setOrigin(0.5, 0.5).setVisible(this.showPointers)
                        : null;

                    const entry = { tilesetName, localId, img, bx, by, labelTxt };
                    this.paletteEntries.push(entry);

                    img.on('pointerdown', () => this._selectPaletteEntry(tilesetName, localId));
                    img.on('pointerover', () => this._onPaletteHover(tilesetName, localId));
                    img.on('pointerout',  () => this._onPaletteHoverEnd());
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
        this.paletteEntries.forEach((entry) => {
            entry.img.setMask(palMask);
            if (entry.labelTxt) entry.labelTxt.setMask(palMask);
        });
        this.palSelBox.setMask(palMask);
        this.palHoverBox = this.add.graphics();
        this.palHoverBox.setMask(palMask);
        this._setPaletteScrollY(0);
        this._redrawPaletteSelection();
    }

    // Top bar: screen tabs (left) + grid-resize buttons (right).
    // Tabs are rebuilt dynamically when the level changes; resize buttons are stubs.
    _buildTopBar() {
        this.screenTabs = [];

        const resizeDefs = [
            { label: '+col', fn: () => this._resizeGrid( 1,  0), ref: null },
            { label: '-col', fn: () => this._resizeGrid(-1,  0), ref: null },
            { label: '+row', fn: () => this._resizeGrid( 0,  1), ref: null },
            { label: '-row', fn: () => this._resizeGrid( 0, -1), ref: null },
            { label: 'UNDO', fn: () => this._undo(),             ref: 'undoButton' },
            { label: 'REDO', fn: () => this._redo(),             ref: 'redoButton' },
        ];
        const rBtnW = 43, rBtnGap = 2;
        const rStartX = MAP_W - resizeDefs.length * (rBtnW + rBtnGap) - 2;
        resizeDefs.forEach(({ label, fn, ref }, i) => {
            const btn = this._makeButton(
                rStartX + i * (rBtnW + rBtnGap), 2, rBtnW, TOP_H - 4,
                label, 6,
                fn
            );
            if (ref) this[ref] = btn;
        });
        this._updateUndoRedoButtons();
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
            { label: 'SAVE',   fn: () => this._actionSave() },
            { label: 'LOAD',   fn: () => this._actionLoad() },
            { label: 'IMPORT', fn: () => this._actionImportExisting() },
            { label: 'NEW',    fn: () => this._actionNew()  },
            { label: 'PLAY',   fn: () => this._actionPlay() },
            { label: 'PTR:ON', fn: () => this._togglePointers() },
            { label: 'MENU',   fn: () => this._actionBack() },
        ];
        const aBtnW = 70, aBtnGap = 1, aRow = BOT_Y + 46;
        actDefs.forEach(({ label, fn }, i) => {
            const btn = this._makeButton(i * (aBtnW + aBtnGap), aRow, aBtnW, 26, label, 7, fn);
            if (label === 'PTR:ON') {
                this.pointerToggleButton = btn;
            } else if (label === 'PLAY') {
                this.add.text(btn.bg.x + (aBtnW / 2), aRow + 28, 'space', ts(5, C_TEXT))
                    .setOrigin(0.5, 0);
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

    // Keyboard shortcuts: ESC back, B/E/F/R/I tools, SPACE play, arrow-key
    // screen pan, Ctrl+S save.
    _setupKeyboard() {
        this.input.mouse.disableContextMenu();
        this.input.keyboard.on('keydown-ESC', () => this._actionBack());

        this.input.keyboard.on('keydown-B', () => this._selectTool('paint'));
        this.input.keyboard.on('keydown-E', () => this._selectTool('erase'));
        this.input.keyboard.on('keydown-F', () => this._selectTool('fill'));
        this.input.keyboard.on('keydown-R', () => this._selectTool('rect'));
        this.input.keyboard.on('keydown-I', () => this._selectTool('pick'));
        this.input.keyboard.on('keydown-P', () => this._togglePointers());
        this.input.keyboard.on('keydown-SPACE', (event) => {
            event.preventDefault();
            this._actionPlay();
        });

        this.input.keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._actionSave();
            }
        });

        this.input.keyboard.on('keydown-Z', (event) => {
            if (event.ctrlKey) { event.preventDefault(); this._undo(); }
        });
        this.input.keyboard.on('keydown-Y', (event) => {
            if (event.ctrlKey) { event.preventDefault(); this._redo(); }
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
        const blankTilesets = [
            { name: 'tileset1',   firstgid: 1  },
            { name: 'guard1set',  firstgid: 26 },
            { name: 'wizard1set', firstgid: 51 },
        ];
        return {
            format: 'stplevel', version: 1,
            name: 'untitled', mapsong: 'main1',
            screensX: 1, screensY: 1, spawnScreen: [0, 0],
            screens: [{
                sx: 0, sy: 0, width: 25, height: 25,
                tilesets: blankTilesets,
                tiles:     new Array(625).fill(0),
                tileProps: StpLevelFormat.canonicalTilePropsForTilesets(blankTilesets)
            }]
        };
    }

    _onLevelLoaded() {
        this.currentScreen = { sx: 0, sy: 0 };
        this.levelData.screens.forEach(s => this._normalizeScreenTilesets(s));
        StpLevelFormat.normalizeLevel(this.levelData);
        this.undoStack     = [];
        this.redoStack     = [];
        this._strokeSnapshot = null;
        this._updateUndoRedoButtons();
        this._rebuildScreenTabs();
        this._redrawTileCanvas();
        this._setStatus(`Loaded ${this.levelData.name || 'untitled'}.`);
    }

    _captureEditorSession() {
        if (!this.levelData) {
            return null;
        }
        return {
            levelData:          this.levelData,
            currentScreen:      { sx: this.currentScreen.sx, sy: this.currentScreen.sy },
            currentTool:        this.currentTool,
            selectedPaletteKey: {
                tilesetName: this.selectedPaletteKey.tilesetName,
                localId:     this.selectedPaletteKey.localId,
            },
            paletteScrollY:     this.paletteScrollY,
            showPointers:       this.showPointers,
            undoStack:          this.undoStack,
            redoStack:          this.redoStack,
        };
    }

    _saveEditorSession() {
        preservedEditorSession = this._captureEditorSession();
        return preservedEditorSession;
    }

    _restoreEditorSession(session) {
        if (!session || !session.levelData) {
            this._loadDefaultLevel();
            return;
        }

        this.levelData = session.levelData;
        this._onLevelLoaded();

        this.undoStack          = session.undoStack || [];
        this.redoStack          = session.redoStack || [];
        this.currentTool        = session.currentTool || 'paint';
        this.selectedPaletteKey = session.selectedPaletteKey || { tilesetName: 'tileset1', localId: 0 };
        this.paletteScrollY     = session.paletteScrollY || 0;
        this.showPointers       = session.showPointers !== false;
        this.currentScreen      = this._validatedScreen(session.currentScreen);

        this._updateToolButtonHighlight();
        this._updateUndoRedoButtons();
        this._updatePointerToggleButton();
        this._updatePalettePointerLabels();
        this._setPaletteScrollY(this.paletteScrollY);
        this._rebuildScreenTabs();
        this._redrawTileCanvas();
        this._setStatus(`Loaded ${this.levelData.name || 'untitled'}.`);
        preservedEditorSession = this._captureEditorSession();
    }

    _validatedScreen(screen) {
        if (!this.levelData || !screen) {
            return { sx: 0, sy: 0 };
        }
        let sx = Number.isFinite(screen.sx) ? screen.sx : 0;
        let sy = Number.isFinite(screen.sy) ? screen.sy : 0;
        sx = Math.max(0, Math.min(this.levelData.screensX - 1, sx));
        sy = Math.max(0, Math.min(this.levelData.screensY - 1, sy));
        if (!this.levelData.screens.find(s => s.sx === sx && s.sy === sy)) {
            return { sx: 0, sy: 0 };
        }
        return { sx, sy };
    }

    // Ensure every screen has all three canonical tilesets so that any tileset
    // can be painted on any screen, regardless of what the saved file contained.
    _normalizeScreenTilesets(screen) {
        for (const canonical of CANONICAL_TILESETS) {
            if (!screen.tilesets.find(t => t.name === canonical.name)) {
                screen.tilesets.push({ name: canonical.name, firstgid: canonical.firstgid });
            }
        }
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
        const gid      = screen.tiles[ty * screen.width + tx];
        const img      = this.tileImages[ty][tx];
        const labelTxt = this.tilePointerLabels[ty][tx];
        if (!gid) {
            img.setTexture('editor_empty').setDisplaySize(TILE_SZ, TILE_SZ);
            labelTxt.setVisible(false);
            return;
        }
        const tsData = this._tilesetForGid(gid, screen.tilesets);
        if (!tsData) {
            img.setTexture('editor_empty').setDisplaySize(TILE_SZ, TILE_SZ);
            labelTxt.setVisible(false);
            return;
        }
        img.setTexture(tsData.name, gid - tsData.firstgid).setDisplaySize(TILE_SZ, TILE_SZ);

        if (this.showPointers) {
            const label = this._pointerLabelForTile(tsData.name, gid - tsData.firstgid);
            if (label) {
                labelTxt.setText(label.text).setColor(label.color).setVisible(true);
            } else {
                labelTxt.setVisible(false);
            }
        } else {
            labelTxt.setVisible(false);
        }
    }

    // Display the human-readable tile name in the info bar when the user clicks a map tile.
    _showTileInfo(tx, ty) {
        const screen = this._currentScreenData();
        if (!screen || tx < 0 || tx >= 25 || ty < 0 || ty >= 25) return;
        const gid = screen.tiles[ty * screen.width + tx];
        if (!gid) { this._setStatus('(empty)'); return; }
        const tsData = this._tilesetForGid(gid, screen.tilesets);
        if (!tsData) { this._setStatus(`GID ${gid}`); return; }
        this._setStatus(this._tileDisplayName(tsData.name, gid - tsData.firstgid));
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
        this._showPaletteTileInfo(tilesetName, localId);
    }

    _onPaletteHover(tilesetName, localId) {
        this.palHoverBox.clear();
        const entry = this.paletteEntries.find(
            e => e.tilesetName === tilesetName && e.localId === localId
        );
        if (entry) {
            this.palHoverBox.lineStyle(1, 0xaaaaaa, 0.5);
            this.palHoverBox.strokeRect(entry.bx, entry.by - this.paletteScrollY, PAL_TILE, PAL_TILE);
        }
        this._setStatus(this._tileDisplayName(tilesetName, localId));
    }

    _onPaletteHoverEnd() {
        this.palHoverBox.clear();
    }

    // Display the human-readable tile name in the info bar for a palette tile selection.
    _showPaletteTileInfo(tilesetName, localId) {
        this._setStatus(this._tileDisplayName(tilesetName, localId));
    }

    // Return the human-readable name for a tile, falling back to tileset+id if unknown.
    _tileDisplayName(tilesetName, localId) {
        const names = TILE_NAMES[tilesetName];
        return (names && names[localId] !== undefined) ? names[localId] : `${tilesetName} #${localId}`;
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
            if (entry.labelTxt) entry.labelTxt.setY(entry.by + PAL_TILE / 2 - clamped);
        });
        this._redrawPaletteSelection();
    }

    _updatePalettePointerLabels() {
        this.paletteEntries.forEach((entry) => {
            if (entry.labelTxt) entry.labelTxt.setVisible(this.showPointers);
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

        if (this.rectDragStart) {
            const end = this._cursorTileFromPreview();
            if (end) {
                this._applyRect(this.rectDragStart.tx, this.rectDragStart.ty, end.tx, end.ty);
            }
            this.rectDragStart = null;
            this.rectPreview.clear();
            this.rectPreview.setVisible(false);
        }

        this._endStroke();
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
        if (!window.confirm('Discard the current editor level and create a new blank level?')) {
            this._setStatus('New level cancelled.');
            return;
        }
        this.levelData = this._makeBlankLevel();
        this._onLevelLoaded();
        this._setStatus('Created blank level.');
    }

    _actionPlay() {
        if (!this.levelData) { this._setStatus('No level loaded.'); return; }
        const editorSession = this._saveEditorSession();
        this.scene.start('GameScene', {
            customLevel:      this.levelData,
            editorUndoStack:  this.undoStack,
            editorRedoStack:  this.redoStack,
            editorSession:    editorSession,
        });
    }

    _actionBack() {
        this._saveEditorSession();
        this.scene.start('MenuScene', { playIntro: false });
    }

    // -------------------------------------------------------------------------
    // Undo / redo
    // -------------------------------------------------------------------------

    // Snapshot tiles of the current screen at the start of a drag stroke or
    // single-step operation (fill, rect). Called before any tile mutation.
    _beginStroke() {
        const screen = this._currentScreenData();
        if (!screen) return;
        this._strokeSnapshot = {
            sx:    this.currentScreen.sx,
            sy:    this.currentScreen.sy,
            tiles: screen.tiles.slice(),
        };
    }

    // Called after a stroke/operation finishes. Compares tile arrays; pushes
    // an undo entry only if something changed. Clears _strokeSnapshot.
    _endStroke() {
        if (!this._strokeSnapshot) return;
        const snap   = this._strokeSnapshot;
        this._strokeSnapshot = null;
        const screen = this.levelData.screens.find(s => s.sx === snap.sx && s.sy === snap.sy);
        if (!screen) return;
        const after  = screen.tiles;
        // Only push if at least one tile actually changed.
        let changed = false;
        for (let i = 0; i < snap.tiles.length; i++) {
            if (snap.tiles[i] !== after[i]) { changed = true; break; }
        }
        if (!changed) return;
        this._pushUndo({
            sx:         snap.sx,
            sy:         snap.sy,
            tilesBefore: snap.tiles,
            tilesAfter:  after.slice(),
        });
    }

    _pushUndo(entry) {
        this.undoStack.push(entry);
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
        this._updateUndoRedoButtons();
    }

    _undo() {
        if (this.undoStack.length === 0) { this._setStatus('Nothing to undo.'); return; }
        const entry = this.undoStack.pop();
        this.redoStack.push(entry);
        this._applyUndoEntry(entry.sx, entry.sy, entry.tilesBefore);
        this._updateUndoRedoButtons();
        this._setStatus(`Undo. (${this.undoStack.length} left)`);
    }

    _redo() {
        if (this.redoStack.length === 0) { this._setStatus('Nothing to redo.'); return; }
        const entry = this.redoStack.pop();
        this.undoStack.push(entry);
        this._applyUndoEntry(entry.sx, entry.sy, entry.tilesAfter);
        this._updateUndoRedoButtons();
        this._setStatus(`Redo. (${this.redoStack.length} left)`);
    }

    _updateUndoRedoButtons() {
        const C_DIS_BG  = 0x1a1a1a;
        const C_DIS_TXT = '#444444';
        if (this.undoButton) {
            const canUndo = this.undoStack.length > 0;
            this.undoButton.bg._baseColor = canUndo ? C_BTN : C_DIS_BG;
            this.undoButton.bg.setFillStyle(this.undoButton.bg._baseColor);
            this.undoButton.txt.setColor(canUndo ? C_TEXT : C_DIS_TXT);
        }
        if (this.redoButton) {
            const canRedo = this.redoStack.length > 0;
            this.redoButton.bg._baseColor = canRedo ? C_BTN : C_DIS_BG;
            this.redoButton.bg.setFillStyle(this.redoButton.bg._baseColor);
            this.redoButton.txt.setColor(canRedo ? C_TEXT : C_DIS_TXT);
        }
    }

    _applyUndoEntry(sx, sy, tiles) {
        if (this.currentScreen.sx !== sx || this.currentScreen.sy !== sy) {
            this._switchToScreen(sx, sy);
        }
        const screen = this._currentScreenData();
        if (!screen) return;
        for (let i = 0; i < tiles.length; i++) screen.tiles[i] = tiles[i];
        this._redrawTileCanvas();
    }

    _togglePointers() {
        this.showPointers = !this.showPointers;
        this._redrawTileCanvas();
        this._updatePalettePointerLabels();
        this._updatePointerToggleButton();
        this._setStatus(this.showPointers ? 'Pointer labels enabled.' : 'Pointer labels hidden.');
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
        StpLevelFormat.normalizeLevel(this.levelData);

        if (this.currentScreen.sx >= newScreensX) this.currentScreen.sx = newScreensX - 1;
        if (this.currentScreen.sy >= newScreensY) this.currentScreen.sy = newScreensY - 1;

        this.undoStack = [];
        this.redoStack = [];
        this._updateUndoRedoButtons();
        this._rebuildScreenTabs();
        this._redrawTileCanvas();
        this._setStatus(`Grid resized to ${newScreensX}x${newScreensY}.`);
    }

    _makeBlankScreen(sx, sy) {
        const blankTilesets = [
            { name: 'tileset1',   firstgid: 1  },
            { name: 'guard1set',  firstgid: 26 },
            { name: 'wizard1set', firstgid: 51 },
        ];
        return {
            sx, sy,
            width: 25,
            height: 25,
            tilesets: blankTilesets,
            tiles: new Array(625).fill(0),
            tileProps: StpLevelFormat.canonicalTilePropsForTilesets(blankTilesets)
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

    // Look up the pointer label definition for a given tileset tile.
    // Returns { text, color } or null if this tile has no annotation.
    _pointerLabelForTile(tilesetName, localId) {
        const setLabels = POINTER_LABELS[tilesetName];
        return setLabels ? (setLabels[localId] || null) : null;
    }

    _editorTextureKey(tilesetName) {
        return tilesetName;
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
