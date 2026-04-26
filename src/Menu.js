// Menu.js — title screen and level loader
// Mirrors Menu.java

import TimerCounter from './TimerCounter.js';
import ControlsInfo from './ControlsInfo.js';

// Render text at the display's physical pixel density so it stays crisp on
// HiDPI / high-DPI screens (retina, 150 % browser zoom, etc.).
// Phaser Text objects default to resolution 1, which looks blurry whenever
// devicePixelRatio > 1.
const TEXT_RESOLUTION = window.devicePixelRatio || 1;

// Text style for the main loader menu entry labels.
const ENTRY_LABEL_STYLE = {
    fontFamily: '"Press Start 2P"',
    fontSize:   '16px',
    color:      '#ffffff',
    resolution: TEXT_RESOLUTION,
};

// Text style for the title shown above the menu entries.
const MENU_TITLE_STYLE = {
    fontFamily: '"Press Start 2P"',
    fontSize:   '10px',
    color:      '#888888',
    resolution: TEXT_RESOLUTION,
};

// Yellow = selected, white = unselected.
const COLOR_SELECTED   = '#ffff00';
const COLOR_UNSELECTED = '#ffffff';

// Y position of the first menu entry and vertical gap between entries.
const ENTRY_START_Y = 220;
const ENTRY_SPACING =  65;

// X center for all entry labels (canvas is 625 wide).
const ENTRY_CENTER_X = 312;

// X position of the cursor arrow image (left of centered text).
const CURSOR_X = 120;

const LOADER_PANEL_X = 90;
const LOADER_PANEL_Y = 155;
const LOADER_PANEL_W = 445;
const LOADER_PANEL_H = 315;
const LOAD_ENTRY_START_Y = 195;
const LOAD_ENTRY_SPACING = 42;

const TIMES_PANEL_X = 62;
const TIMES_PANEL_Y = 82;
const TIMES_PANEL_W = 501;
const TIMES_PANEL_H = 500;
const TIMES_ROW_START_Y = 170;
const TIMES_ROW_SPACING = 48;
const TIMES_LEVEL_X = 105;
const TIMES_YOUR_X = 280;
const TIMES_DEV_X = 430;

const TIMES_LABEL_STYLE = {
    fontFamily: '"Press Start 2P"',
    fontSize:   '10px',
    color:      '#ffff00',
    resolution: TEXT_RESOLUTION,
};

const TIMES_VALUE_STYLE = {
    fontFamily: '"Press Start 2P"',
    fontSize:   '10px',
    color:      '#ffff00',
    resolution: TEXT_RESOLUTION,
};

export default class Menu {
    constructor(scene, sound, save) {
        this.scene = scene;
        this.sound = sound;    // SoundManager
        this.save  = save;     // SaveReader

        this.inmenuimg           = true;
        this.inloaderimg         = false;
        this.inTimesScreen       = false;  // sub-state: times overlay is showing
        this.inLoadScreen        = false;
        this.loaderImgMenuStatus = 0;      // index of selected entry in this.entries
        this.visibleStart        = 0;      // scroll window: first visible entry index
        this.counter             = 0;
        this.displaypress        = false;
        this.timestatinfo        = new TimerCounter(null);
        this.inputMode           = 'keyboard';
        this.loadLevelCount      = 0;
    }

    create() {
        const s = this.scene;
        ControlsInfo.setMode(this.inputMode === 'keyboard' ? 'keyboard' : 'virtual');

        // --- Menu (title) image ---
        this.menuImg  = s.add.image(0, 0, 'menunew').setOrigin(0, 0).setDisplaySize(625, 625);
        // Tap / click anywhere on the title screen advances to the loader.
        this.menuImg.setInteractive();
        this.menuImg.on('pointerdown', (pointer) => {
            this._setInputModeFromPointer(pointer);
            if (this.inmenuimg) {
                this.sound.sfx('menuchange');
                this._switchToLoader();
            } else if (this.inloaderimg && !this.inTimesScreen && !this._isPointerInLoaderPanel(pointer)) {
                this.sound.sfx('menuchange');
                this._switchToMenu();
            }
        });

        // "PRESS SPACE TO START" blink prompt — Phaser text, replaces space2start.png.
        this.pressText = s.add.text(ENTRY_CENTER_X, 370, 'PRESS SPACE TO START', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffff00',
            resolution: TEXT_RESOLUTION,
        }).setOrigin(0, 0).setVisible(false);
        this._centerTextOnPixel(this.pressText, ENTRY_CENTER_X, 370);

        // --- Loader screen — drawn entirely with Phaser; no loader.png ---
        // Dark panel with a yellow border framing the menu entries.
        this.loaderPanel = s.add.graphics();
        this.loaderPanel.fillStyle(0x000000, 0.85);
        this.loaderPanel.fillRect(LOADER_PANEL_X, LOADER_PANEL_Y, LOADER_PANEL_W, LOADER_PANEL_H);
        this.loaderPanel.lineStyle(2, 0xffff00, 1);
        this.loaderPanel.strokeRect(LOADER_PANEL_X, LOADER_PANEL_Y, LOADER_PANEL_W, LOADER_PANEL_H);
        this.loaderPanel.setVisible(false);

        // Small "SELECT" label above the entries.
        this.loaderTitleText = s.add.text(ENTRY_CENTER_X, LOADER_PANEL_Y + 18, 'SELECT', MENU_TITLE_STYLE)
                                    .setOrigin(0, 0).setVisible(false);
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, LOADER_PANEL_Y + 18);

        // --- Menu entries --------------------------------------------------
        // Each entry has a human-readable label, the action to run on ENTER/SPACE,
        // and a textObj created just below.  To add or rename a button, edit only
        // this array — everything else (rendering, input, cursor) derives from it.
        // -------------------------------------------------------------------
        this.entries = [
            { label: 'NEW GAME',     action: () => this._actionNewGame()     },
            { label: 'LOAD GAME',    action: () => this._actionLoadGame()    },
            { label: 'TIMES',        action: () => this._actionTimes()       },
            { label: 'LEVEL EDITOR', action: () => this._actionLevelEditor() },
        ];

        // visibleCount covers all entries for now; scroll infrastructure is in
        // place for future expansion (see _scrollToSelected / _setEntriesVisible).
        this.visibleCount = this.entries.length;

        // Create a Phaser text object for every entry, evenly spaced.
        // Each text object is interactive: pointerover selects it (mouse hover),
        // pointerdown fires its action (mouse click or finger tap).
        this.entries.forEach((entry, i) => {
            entry.textObj = s.add.text(
                ENTRY_CENTER_X,
                ENTRY_START_Y + i * ENTRY_SPACING,
                entry.label,
                ENTRY_LABEL_STYLE
            ).setOrigin(0, 0).setVisible(false);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, ENTRY_START_Y + i * ENTRY_SPACING);

            entry.textObj.setInteractive({ useHandCursor: true });

            // Hover: select this entry if it isn't already selected.
            entry.textObj.on('pointerover', () => {
                if (!this.inloaderimg || this.inTimesScreen || this.inLoadScreen) return;
                if (this.loaderImgMenuStatus !== i) {
                    this.loaderImgMenuStatus = i;
                    this._scrollToSelected();
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            });

            // Click / tap: select then activate.
            entry.textObj.on('pointerdown', (pointer) => {
                this._setInputModeFromPointer(pointer);
                if (!this.inloaderimg || this.inTimesScreen || this.inLoadScreen) return;
                if (this.loaderImgMenuStatus !== i) {
                    this.loaderImgMenuStatus = i;
                    this._updateCursorPos();
                }
                this.sound.sfx('menuchange');
                entry.action();
            });
        });

        this.loadEntries = this.save.levellist.slice(0, this.save.levellist.length - 1).map((levelName, i) => {
            const entry = {
                levelName,
                label: 'LEVEL ' + (i + 1),
                action: () => this._actionLoadSpecificLevel(levelName)
            };

            entry.textObj = s.add.text(
                ENTRY_CENTER_X,
                LOAD_ENTRY_START_Y + i * LOAD_ENTRY_SPACING,
                entry.label,
                ENTRY_LABEL_STYLE
            ).setOrigin(0, 0).setVisible(false);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, LOAD_ENTRY_START_Y + i * LOAD_ENTRY_SPACING);

            entry.textObj.setInteractive({ useHandCursor: true });
            entry.textObj.on('pointerover', () => {
                if (!this.inloaderimg || this.inTimesScreen || !this.inLoadScreen || i >= this.loadLevelCount) return;
                if (this.loaderImgMenuStatus !== i) {
                    this.loaderImgMenuStatus = i;
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            });
            entry.textObj.on('pointerdown', (pointer) => {
                this._setInputModeFromPointer(pointer);
                if (!this.inloaderimg || this.inTimesScreen || !this.inLoadScreen || i >= this.loadLevelCount) return;
                if (this.loaderImgMenuStatus !== i) {
                    this.loaderImgMenuStatus = i;
                    this._updateCursorPos();
                }
                this.sound.sfx('menuchange');
                entry.action();
            });
            return entry;
        });

        // Cursor arrow — X is fixed, Y tracks the selected entry.
        this.cursorImg = s.add.image(CURSOR_X, ENTRY_START_Y, 'loadercursor')
                              .setOrigin(0, 0)
                              .setVisible(false);

        // --- Times screen ---
        this.timesDismissZone = s.add.rectangle(0, 0, 625, 625, 0x000000, 0)
            .setOrigin(0, 0)
            .setVisible(false);
        this.timesDismissZone.on('pointerdown', (pointer) => {
            this._setInputModeFromPointer(pointer);
            if (this.inTimesScreen) {
                this.sound.sfx('menuchange');
                this._dismissTimesScreen();
            }
        });

        this.timesPanel = s.add.graphics();
        this.timesPanel.fillStyle(0x000000, 0.92);
        this.timesPanel.fillRect(TIMES_PANEL_X, TIMES_PANEL_Y, TIMES_PANEL_W, TIMES_PANEL_H);
        this.timesPanel.lineStyle(2, 0xffff00, 1);
        this.timesPanel.strokeRect(TIMES_PANEL_X, TIMES_PANEL_Y, TIMES_PANEL_W, TIMES_PANEL_H);
        this.timesPanel.setVisible(false);

        this.timesTitleText = s.add.text(ENTRY_CENTER_X, 105, 'TIMES', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#888888',
            resolution: TEXT_RESOLUTION,
        }).setOrigin(0, 0).setVisible(false);
        this._centerTextOnPixel(this.timesTitleText, ENTRY_CENTER_X, 105);

        this.timesHeaderTexts = [
            s.add.text(TIMES_LEVEL_X, 138, 'level', TIMES_LABEL_STYLE).setVisible(false),
            s.add.text(TIMES_YOUR_X, 138, 'your best', TIMES_LABEL_STYLE).setVisible(false),
            s.add.text(TIMES_DEV_X, 138, 'dev best', TIMES_LABEL_STYLE).setVisible(false)
        ];

        this.timesRows = [];
        for (let i = 0; i < 6; i++) {
            const rowY = TIMES_ROW_START_Y + i * TIMES_ROW_SPACING;
            this.timesRows.push({
                levelText: s.add.text(TIMES_LEVEL_X, rowY, 'level ' + (i + 1), TIMES_VALUE_STYLE).setVisible(false),
                yourText:  s.add.text(TIMES_YOUR_X, rowY, '', TIMES_VALUE_STYLE).setVisible(false),
                devText:   s.add.text(TIMES_DEV_X, rowY, '', TIMES_VALUE_STYLE).setVisible(false)
            });
        }

        this.timesAllText = s.add.text(105, 468, '', {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffff00', resolution: TEXT_RESOLUTION,
        }).setVisible(false);

        // --- Input ---
        this.keys = s.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc:   Phaser.Input.Keyboard.KeyCodes.ESC
        });
    }

    update() {
        const K = Phaser.Input.Keyboard.JustDown;
        const k = this.keys;

        if (this.inmenuimg) {
            this.counter++;
            if (this.counter > 45) { this.counter = 0; this.displaypress = !this.displaypress; }
            this.pressText.setVisible(this.displaypress);

            if (K(k.space) || K(k.enter)) {
                this._setInputMode('keyboard');
                this.sound.sfx('menuchange');
                this._switchToLoader();
            }

        } else if (this.inloaderimg) {

            // Sub-state: times overlay is showing — any confirm/back key dismisses it.
            if (this.inTimesScreen) {
                if (K(k.esc) || K(k.space) || K(k.enter)) {
                    this._setInputMode('keyboard');
                    this.sound.sfx('menuchange');
                    this._dismissTimesScreen();
                }
                return;
            }

            if (this.inLoadScreen) {
                if (K(k.down)) {
                    this._setInputMode('keyboard');
                    if (this.loaderImgMenuStatus < this.loadLevelCount - 1) {
                        this.loaderImgMenuStatus++;
                        this._updateCursorPos();
                        this.sound.sfx('menuchange');
                    }
                } else if (K(k.up)) {
                    this._setInputMode('keyboard');
                    if (this.loaderImgMenuStatus > 0) {
                        this.loaderImgMenuStatus--;
                        this._updateCursorPos();
                        this.sound.sfx('menuchange');
                    }
                } else if (K(k.esc)) {
                    this._setInputMode('keyboard');
                    this.sound.sfx('menuchange');
                    this._dismissLoadScreen();
                } else if (K(k.space) || K(k.enter)) {
                    this._setInputMode('keyboard');
                    this.sound.sfx('menuchange');
                    this.loadEntries[this.loaderImgMenuStatus].action();
                }
                return;
            }

            if (K(k.down)) {
                this._setInputMode('keyboard');
                if (this.loaderImgMenuStatus < this.entries.length - 1) {
                    this.loaderImgMenuStatus++;
                    this._scrollToSelected();
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.up)) {
                this._setInputMode('keyboard');
                if (this.loaderImgMenuStatus > 0) {
                    this.loaderImgMenuStatus--;
                    this._scrollToSelected();
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.esc)) {
                this._setInputMode('keyboard');
                this.sound.sfx('menuchange');
                this._switchToMenu();
            } else if (K(k.space) || K(k.enter)) {
                this._setInputMode('keyboard');
                this.sound.sfx('menuchange');
                this.entries[this.loaderImgMenuStatus].action();
            }
        }
    }

    // --- Entry actions (one method per entry — edit here to change behavior) ---

    _actionNewGame() {
        this.save.newGame();
        this._loadGame();
    }

    _actionLoadGame() {
        this.save.loadGame();
        this._showLoadScreen();
    }

    _actionLoadSpecificLevel(levelName) {
        this.save.setCurrentLevel(levelName);
        this._loadGame();
    }

    _actionTimes() {
        this.inTimesScreen = true;
        this._setEntriesVisible(false);
        this.cursorImg.setVisible(false);
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this._setTimesVisible(true);
        this._updateTimesDisplay();
    }

    _actionLevelEditor() {
        this.sound.stop();
        this.scene.scene.start('LevelEditorScene');
    }

    // --- Screen transitions ---

    _dismissTimesScreen() {
        this._setTimesVisible(false);
        this.inTimesScreen = false;
        this.loaderPanel.setVisible(true);
        this.loaderTitleText.setVisible(true);
        this._setEntriesVisible(true);
        this.cursorImg.setVisible(true);
    }

    _showLoadScreen() {
        this.inLoadScreen = true;
        this.loadLevelCount = this.save.getLoadableLevels().length;
        this.loaderImgMenuStatus = Math.max(0, this.loadLevelCount - 1);
        this.loaderTitleText.setText('LOAD GAME');
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, 173);
        this._setEntriesVisible(false);
        this._setLoadEntriesVisible(true);
        this.cursorImg.setVisible(true);
        this._updateCursorPos();
    }

    _dismissLoadScreen() {
        this.inLoadScreen = false;
        this.loaderImgMenuStatus = 1;
        this.loaderTitleText.setText('SELECT');
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, 173);
        this._setLoadEntriesVisible(false);
        this._setEntriesVisible(true);
        this.cursorImg.setVisible(true);
        this._updateCursorPos();
    }

    _switchToLoader() {
        this.inmenuimg   = false;
        this.inloaderimg = true;
        this.inLoadScreen = false;
        // menuImg (castle background) stays visible — the loaderPanel sits on top.
        this.pressText.setVisible(false);
        this.loaderPanel.setVisible(true);
        this.loaderTitleText.setVisible(true);
        this.loaderTitleText.setText('SELECT');
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, 173);
        this._setEntriesVisible(true);
        this._setLoadEntriesVisible(false);
        this.cursorImg.setVisible(true);
        this._updateCursorPos();
    }

    _switchToMenu() {
        if (this.inLoadScreen) {
            this.loaderImgMenuStatus = 1;
        }
        this.inmenuimg     = true;
        this.inloaderimg   = false;
        this.inTimesScreen = false;
        this.inLoadScreen  = false;
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
        this._setLoadEntriesVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
    }

    // --- Layout helpers ---

    // Center a text object while keeping its top-left corner on integer pixels.
    // Pixel fonts blur if the rendered text texture lands on half-pixels.
    _centerTextOnPixel(textObj, centerX, y) {
        textObj.setPosition(Math.round(centerX - (textObj.width / 2)), Math.round(y));
    }

    refreshTextLayout() {
        this.pressText.setFontFamily('"Press Start 2P"');
        this._updateStartPromptText();

        this.loaderTitleText.setFontFamily('"Press Start 2P"');
        this.loaderTitleText.setText(this.inLoadScreen ? 'LOAD GAME' : 'SELECT');
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, 173);

        this.entries.forEach((entry, i) => {
            entry.textObj.setFontFamily('"Press Start 2P"');
            entry.textObj.setText(entry.label);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, ENTRY_START_Y + i * ENTRY_SPACING);
        });

        this.loadEntries.forEach((entry, i) => {
            entry.textObj.setFontFamily('"Press Start 2P"');
            entry.textObj.setText(entry.label);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, LOAD_ENTRY_START_Y + i * LOAD_ENTRY_SPACING);
        });

        this.timesTitleText.setFontFamily('"Press Start 2P"');
        this._centerTextOnPixel(this.timesTitleText, ENTRY_CENTER_X, 105);
        this.timesHeaderTexts.forEach(textObj => {
            textObj.setFontFamily('"Press Start 2P"');
        });
        this.timesRows.forEach((row, i) => {
            row.levelText.setFontFamily('"Press Start 2P"');
            row.yourText.setFontFamily('"Press Start 2P"');
            row.devText.setFontFamily('"Press Start 2P"');
            row.levelText.setText('level ' + (i + 1));
        });
        this.timesAllText.setFontFamily('"Press Start 2P"');
    }

    // Show or hide all entry text objects that fall within the scroll window.
    _setEntriesVisible(visible) {
        const windowEnd = this.visibleStart + this.visibleCount;
        this.entries.forEach((entry, i) => {
            const inWindow = (i >= this.visibleStart && i < windowEnd);
            entry.textObj.setVisible(visible && inWindow);
        });
        this._updateEntryColors();
    }

    _setLoadEntriesVisible(visible) {
        this.loadEntries.forEach((entry, i) => {
            entry.textObj.setVisible(visible && i < this.loadLevelCount);
        });
        this._updateEntryColors();
    }

    // If the selected entry has scrolled out of view, shift the window to include it.
    _scrollToSelected() {
        const windowEnd = this.visibleStart + this.visibleCount;
        if (this.loaderImgMenuStatus < this.visibleStart) {
            this.visibleStart = this.loaderImgMenuStatus;
        } else if (this.loaderImgMenuStatus >= windowEnd) {
            this.visibleStart = this.loaderImgMenuStatus - this.visibleCount + 1;
        }
    }

    // Highlight the selected entry yellow; leave all others white.
    _updateEntryColors() {
        this.loadEntries.forEach((entry, i) => {
            if (!this.inLoadScreen || i >= this.loadLevelCount) {
                entry.textObj.setColor(COLOR_UNSELECTED);
                return;
            }
            entry.textObj.setColor(
                i === this.loaderImgMenuStatus ? COLOR_SELECTED : COLOR_UNSELECTED
            );
        });

        this.entries.forEach((entry, i) => {
            entry.textObj.setColor(
                !this.inLoadScreen && i === this.loaderImgMenuStatus ? COLOR_SELECTED : COLOR_UNSELECTED
            );
        });
    }

    // Move the cursor image to sit beside the currently selected entry.
    _updateCursorPos() {
        this._updateEntryColors();
        const selectedEntry = this.inLoadScreen
            ? this.loadEntries[this.loaderImgMenuStatus]
            : this.entries[this.loaderImgMenuStatus];
        this.cursorImg.setY(selectedEntry.textObj.y);
    }

    _setTimesVisible(v) {
        this.timesDismissZone.setVisible(v);
        if (v) {
            this.timesDismissZone.setInteractive();
        } else {
            this.timesDismissZone.disableInteractive();
        }
        this.timesPanel.setVisible(v);
        this.timesTitleText.setVisible(v);
        this.timesHeaderTexts.forEach(t => t.setVisible(v));
        this.timesRows.forEach(row => {
            row.levelText.setVisible(v);
            row.yourText.setVisible(v);
            row.devText.setVisible(v);
        });
        this.timesAllText.setVisible(v);
    }

    _updateTimesDisplay() {
        const levels = ['Level1','Level2','Level3','Level4','Level5','Level6'];
        let beatCount = 0;
        levels.forEach((lvl, i) => {
            const raw = this.timestatinfo.gettimeraw(lvl);
            const isRecord = raw < this.timestatinfo.getRecTime(lvl);
            const row = this.timesRows[i];
            row.levelText.setText('level ' + (i + 1));
            row.yourText.setText(this.timestatinfo.hasRecordedTime(lvl)
                ? this.timestatinfo.gettime(lvl)
                : 'none');
            row.yourText.setColor(isRecord ? '#00ff00' : '#ffff00');
            row.devText.setText(this.timestatinfo.getRecTimeDisplay(lvl));
            row.devText.setColor('#ffff00');
            if (isRecord) beatCount++;
        });
        this.timesAllText.setText(beatCount >= 6
            ? "Grats on beating my times.\nSee you in the sequel!\n-spotco"
            : '');
    }

    _setInputModeFromPointer(pointer) {
        const event = pointer ? pointer.event : null;
        this._setInputMode(event && event.pointerType === 'touch' ? 'touch' : 'click');
    }

    _setInputMode(mode) {
        this.inputMode = mode;
        this._updateStartPromptText();
        ControlsInfo.setMode(mode === 'keyboard' ? 'keyboard' : 'virtual');
    }

    _getStartPromptText() {
        if (this.inputMode === 'touch') {
            return 'TAP TO START';
        }
        if (this.inputMode === 'click') {
            return 'CLICK TO START';
        }
        return 'PRESS SPACE TO START';
    }

    _updateStartPromptText() {
        if (!this.pressText) return;
        this.pressText.setText(this._getStartPromptText());
        this._centerTextOnPixel(this.pressText, ENTRY_CENTER_X, 370);
    }

    _isPointerInLoaderPanel(pointer) {
        if (!pointer) return false;
        return pointer.x >= LOADER_PANEL_X &&
            pointer.x <= LOADER_PANEL_X + LOADER_PANEL_W &&
            pointer.y >= LOADER_PANEL_Y &&
            pointer.y <= LOADER_PANEL_Y + LOADER_PANEL_H;
    }

    _loadGame() {
        const levelName = this.save.getCurrentLevel();
        if (levelName === 'End') {
            // Saved End state returns to the title menu (matches original menu fallback).
            this.reset();
        } else {
            this.sound.stop();
            this.scene.scene.start('GameScene', { levelName });
        }
    }

    reset() {
        this.inmenuimg           = true;
        this.inloaderimg         = false;
        this.inTimesScreen       = false;
        this.inLoadScreen        = false;
        this.loaderImgMenuStatus = 0;
        this.counter             = 0;
        this.displaypress        = false;
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
        this._setLoadEntriesVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
        this.pressText.setVisible(false);
        this.sound.stop();
        this.sound.play('menu1');
    }

    startIntroAnimation() {
        this.inmenuimg    = true;
        this.inloaderimg  = false;
        this.counter      = 0;
        this.displaypress = false;
        this.menuImg.setVisible(false);
        this.pressText.setVisible(false);
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
        this._setLoadEntriesVisible(false);
        this._setTimesVisible(false);

        if (this.animationManager) {
            this.animationManager.startAnimation('titleScreenAnimation', null);
        }
    }

    finishIntroAnimation() {
        this.inmenuimg    = true;
        this.inloaderimg  = false;
        this.counter      = 0;
        this.displaypress = false;
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
        this._setLoadEntriesVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
        this.pressText.setVisible(false);
    }
}
