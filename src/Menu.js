// Menu.js — title screen and level loader
// Mirrors Menu.java

import TimerCounter from './TimerCounter.js';

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

export default class Menu {
    constructor(scene, sound, save) {
        this.scene = scene;
        this.sound = sound;    // SoundManager
        this.save  = save;     // SaveReader

        this.inmenuimg           = true;
        this.inloaderimg         = false;
        this.inTimesScreen       = false;  // sub-state: times overlay is showing
        this.loaderImgMenuStatus = 0;      // index of selected entry in this.entries
        this.visibleStart        = 0;      // scroll window: first visible entry index
        this.counter             = 0;
        this.displaypress        = false;
        this.timestatinfo        = new TimerCounter(null);
    }

    create() {
        const s = this.scene;

        // --- Menu (title) image ---
        this.menuImg  = s.add.image(0, 0, 'menunew').setOrigin(0, 0).setDisplaySize(625, 625);

        // "PRESS SPACE TO START" blink prompt — Phaser text, replaces space2start.png.
        this.pressText = s.add.text(ENTRY_CENTER_X, 370, 'PRESS SPACE TO START', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ffff00',
            resolution: TEXT_RESOLUTION,
        }).setOrigin(0, 0).setVisible(false);
        this._centerTextOnPixel(this.pressText, ENTRY_CENTER_X, 370);

        // --- Loader screen — drawn entirely with Phaser; no loader.png ---
        // Dark panel with a yellow border framing the menu entries.
        const panelX = 90, panelY = 155, panelW = 445, panelH = 315;
        this.loaderPanel = s.add.graphics();
        this.loaderPanel.fillStyle(0x000000, 0.85);
        this.loaderPanel.fillRect(panelX, panelY, panelW, panelH);
        this.loaderPanel.lineStyle(2, 0xffff00, 1);
        this.loaderPanel.strokeRect(panelX, panelY, panelW, panelH);
        this.loaderPanel.setVisible(false);

        // Small "SELECT" label above the entries.
        this.loaderTitleText = s.add.text(ENTRY_CENTER_X, panelY + 18, 'SELECT', MENU_TITLE_STYLE)
                                    .setOrigin(0, 0).setVisible(false);
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, panelY + 18);

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
        this.entries.forEach((entry, i) => {
            entry.textObj = s.add.text(
                ENTRY_CENTER_X,
                ENTRY_START_Y + i * ENTRY_SPACING,
                entry.label,
                ENTRY_LABEL_STYLE
            ).setOrigin(0, 0).setVisible(false);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, ENTRY_START_Y + i * ENTRY_SPACING);
        });

        // Cursor arrow — X is fixed, Y tracks the selected entry.
        this.cursorImg = s.add.image(CURSOR_X, ENTRY_START_Y, 'loadercursor')
                              .setOrigin(0, 0)
                              .setVisible(false);

        // --- Times screen ---
        this.timesmenuImg = s.add.image(0, 0, 'timesmenu').setOrigin(0, 0);
        this.timesmenuImg.setVisible(false);

        const timeY = [135, 165, 194, 220, 250, 279];
        this.timesTexts = timeY.map(y =>
            s.add.text(300, y, '', { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffff00', resolution: TEXT_RESOLUTION }).setVisible(false)
        );
        this.timesAllText = s.add.text(190, 305, '', {
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
                this.sound.sfx('menuchange');
                this._switchToLoader();
            }

        } else if (this.inloaderimg) {

            // Sub-state: times overlay is showing — any confirm/back key dismisses it.
            if (this.inTimesScreen) {
                if (K(k.esc) || K(k.space) || K(k.enter)) {
                    this.sound.sfx('menuchange');
                    this._setTimesVisible(false);
                    this.inTimesScreen = false;
                    this.loaderPanel.setVisible(true);
                    this.loaderTitleText.setVisible(true);
                    this._setEntriesVisible(true);
                    this.cursorImg.setVisible(true);
                }
                return;
            }

            if (K(k.down)) {
                if (this.loaderImgMenuStatus < this.entries.length - 1) {
                    this.loaderImgMenuStatus++;
                    this._scrollToSelected();
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.up)) {
                if (this.loaderImgMenuStatus > 0) {
                    this.loaderImgMenuStatus--;
                    this._scrollToSelected();
                    this._updateCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.esc)) {
                this.sound.sfx('menuchange');
                this._switchToMenu();
            } else if (K(k.space) || K(k.enter)) {
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

    _switchToLoader() {
        this.inmenuimg   = false;
        this.inloaderimg = true;
        // menuImg (castle background) stays visible — the loaderPanel sits on top.
        this.pressText.setVisible(false);
        this.loaderPanel.setVisible(true);
        this.loaderTitleText.setVisible(true);
        this._setEntriesVisible(true);
        this.cursorImg.setVisible(true);
        this._updateCursorPos();
    }

    _switchToMenu() {
        this.inmenuimg     = true;
        this.inloaderimg   = false;
        this.inTimesScreen = false;
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
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
        this.pressText.setText('PRESS SPACE TO START');
        this._centerTextOnPixel(this.pressText, ENTRY_CENTER_X, 370);

        this.loaderTitleText.setFontFamily('"Press Start 2P"');
        this.loaderTitleText.setText('SELECT');
        this._centerTextOnPixel(this.loaderTitleText, ENTRY_CENTER_X, 173);

        this.entries.forEach((entry, i) => {
            entry.textObj.setFontFamily('"Press Start 2P"');
            entry.textObj.setText(entry.label);
            this._centerTextOnPixel(entry.textObj, ENTRY_CENTER_X, ENTRY_START_Y + i * ENTRY_SPACING);
        });
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
        this.entries.forEach((entry, i) => {
            entry.textObj.setColor(
                i === this.loaderImgMenuStatus ? COLOR_SELECTED : COLOR_UNSELECTED
            );
        });
    }

    // Move the cursor image to sit beside the currently selected entry.
    _updateCursorPos() {
        this._updateEntryColors();
        const selectedEntry = this.entries[this.loaderImgMenuStatus];
        this.cursorImg.setY(selectedEntry.textObj.y);
    }

    _setTimesVisible(v) {
        this.timesmenuImg.setVisible(v);
        this.timesTexts.forEach(t => t.setVisible(v));
        this.timesAllText.setVisible(v);
    }

    _updateTimesDisplay() {
        const levels = ['Level1','Level2','Level3','Level4','Level5','Level6'];
        let beatCount = 0;
        levels.forEach((lvl, i) => {
            const raw = this.timestatinfo.gettimeraw(lvl);
            const isRecord = raw < this.timestatinfo.getRecTime(lvl);
            this.timesTexts[i].setText(this.timestatinfo.gettime(lvl));
            this.timesTexts[i].setColor(isRecord ? '#00ff00' : '#ffff00');
            if (isRecord) beatCount++;
        });
        this.timesAllText.setText(beatCount >= 6
            ? "Grats on beating my times.\nSee you in the sequel!\n-spotco"
            : '');
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
        this.loaderImgMenuStatus = 0;
        this.counter             = 0;
        this.displaypress        = false;
        this.loaderPanel.setVisible(false);
        this.loaderTitleText.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setEntriesVisible(false);
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
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
        this.pressText.setVisible(false);
    }
}
