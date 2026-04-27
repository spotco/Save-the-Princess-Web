// RenderModeManager.js — shared 2D/3D render mode preference and scene rules

const LOCAL_STORAGE_KEY = 'stp-render-mode';
const DEFAULT_MODE      = '3d';

export default new class RenderModeManager {

    constructor() {
        this.currentMode = DEFAULT_MODE;
        this.modeButtons = {};
        this.sceneNoteElement = null;
        this.listeners = [];
    }

    install() {
        this.currentMode = this._readStoredMode();
        this._bindDomElements();
        this._updateDomState('');
    }

    getMode() {
        return this.currentMode;
    }

    getGameplayMode() {
        return this.currentMode;
    }

    getSceneMode(sceneKey) {
        if (sceneKey === 'GameScene') {
            return this.getGameplayMode();
        }
        return '2d';
    }

    applySceneMode(sceneKey) {
        const activeSceneKey = sceneKey || '';
        const sceneMode = this.getSceneMode(activeSceneKey);

        this._updateDomState(activeSceneKey);
        return sceneMode;
    }

    setMode(mode) {
        const normalizedMode = this._normalizeMode(mode);

        if (normalizedMode === this.currentMode) {
            this._updateDomState(document.body.dataset.stpActiveScene || '');
            return this.currentMode;
        }

        this.currentMode = normalizedMode;
        localStorage.setItem(LOCAL_STORAGE_KEY, this.currentMode);
        this._updateDomState(document.body.dataset.stpActiveScene || '');
        this._emitChange();
        return this.currentMode;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index >= 0) {
                this.listeners.splice(index, 1);
            }
        };
    }

    _readStoredMode() {
        const storedMode = localStorage.getItem(LOCAL_STORAGE_KEY);
        return this._normalizeMode(storedMode, DEFAULT_MODE);
    }

    _normalizeMode(mode, fallbackMode = this.currentMode || DEFAULT_MODE) {
        if (mode === '2d' || mode === '3d') {
            return mode;
        }

        if (mode !== null && mode !== undefined && mode !== '') {
            console.warn('RenderModeManager: unknown render mode:', mode);
        }
        return fallbackMode;
    }

    _bindDomElements() {
        const button2d = document.getElementById('render-mode-2d');
        const button3d = document.getElementById('render-mode-3d');

        this.modeButtons = {
            '2d': button2d,
            '3d': button3d
        };
        this.sceneNoteElement = document.getElementById('render-mode-scene-note');

        for (const mode of Object.keys(this.modeButtons)) {
            const button = this.modeButtons[mode];
            if (!button || button.dataset.renderModeBound === 'true') {
                continue;
            }

            button.dataset.renderModeBound = 'true';
            button.addEventListener('click', () => {
                this.setMode(mode);
            });
        }
    }

    _updateDomState(activeSceneKey) {
        const sceneMode = this.getSceneMode(activeSceneKey);
        const gameContainer = document.getElementById('game-container');

        document.body.dataset.stpRenderPreference = this.currentMode;
        document.body.dataset.stpRenderSceneMode  = sceneMode;
        document.body.dataset.stpActiveScene      = activeSceneKey;

        if (gameContainer) {
            gameContainer.dataset.stpRenderPreference = this.currentMode;
            gameContainer.dataset.stpRenderSceneMode  = sceneMode;
            gameContainer.dataset.stpActiveScene      = activeSceneKey;
        }

        for (const mode of Object.keys(this.modeButtons)) {
            const button = this.modeButtons[mode];
            if (!button) {
                continue;
            }

            const isActive = mode === this.currentMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }

        if (this.sceneNoteElement) {
            this.sceneNoteElement.textContent = this._sceneNoteText(activeSceneKey, sceneMode);
        }
    }

    _sceneNoteText(activeSceneKey, sceneMode) {
        if (activeSceneKey === 'GameScene') {
            return 'scene: ' + sceneMode + ' gameplay';
        }
        if (activeSceneKey === 'LevelEditorScene') {
            return 'scene: 2d editor';
        }
        if (activeSceneKey === 'MenuScene') {
            return 'scene: 2d menu';
        }
        if (activeSceneKey === 'BootScene') {
            return 'scene: 2d boot';
        }
        return 'scene: 2d ui';
    }

    _emitChange() {
        const detail = {
            preferredMode: this.currentMode,
            activeScene: document.body.dataset.stpActiveScene || '',
            sceneMode: document.body.dataset.stpRenderSceneMode || this.getSceneMode('')
        };

        for (const listener of this.listeners) {
            listener(detail);
        }

        window.dispatchEvent(new CustomEvent('stp-render-mode-change', { detail }));
    }
}();
