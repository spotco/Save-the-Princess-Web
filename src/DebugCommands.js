import SaveReader from './SaveReader.js';
import TimerCounter from './TimerCounter.js';

export default class DebugCommands {
    constructor(game) {
        this.game = game;
        this.saveReader = new SaveReader();
    }

    install() {
        window.debug_help = this.debug_help.bind(this);
        window.skip_level = this.skip_level.bind(this);
        window.get_saved_max_level = this.get_saved_max_level.bind(this);
        window.set_saved_max_level = this.set_saved_max_level.bind(this);
        window.reset_best_times = this.reset_best_times.bind(this);
        window.toggle_hitboxes = this.toggle_hitboxes.bind(this);
    }

    debug_help() {
        const lines = [
            'Available debug commands:',
            'debug_help() - Show this help.',
            'skip_level() - Skip the current level or exit the ending sequence.',
            'get_saved_max_level() - Print the current saved max level.',
            'set_saved_max_level(level) - Set the saved max level. Accepts 1-6, Level1-Level6, or End.',
            'reset_best_times() - Reset all saved best times.',
            'toggle_hitboxes() - Toggle gameplay hitbox overlays.'
        ];
        lines.forEach((line) => console.log(line));
        return lines;
    }

    skip_level() {
        const gameScene = this._getActiveGameScene();
        if (gameScene === null || !gameScene.stpview || !gameScene.isReady) {
            console.log('skip_level(): no active gameplay scene.');
            return false;
        }

        gameScene.stpview.debugSkipLevel();
        return true;
    }

    get_saved_max_level() {
        this.saveReader.loadGame();
        const savedMaxLevel = this.saveReader.getHighestUnlockedLevel();
        console.log('Saved max level:', savedMaxLevel);
        return savedMaxLevel;
    }

    set_saved_max_level(levelValue) {
        const normalizedLevelName = this.saveReader.setHighestUnlockedLevel(levelValue);
        if (normalizedLevelName === null) {
            console.log('set_saved_max_level(level): expected 1-6, Level1-Level6, or End.');
            return false;
        }

        this._syncLiveSaveReaders(normalizedLevelName);
        console.log('Saved max level set to:', normalizedLevelName);
        return normalizedLevelName;
    }

    reset_best_times() {
        TimerCounter.resetAllSavedTimes();
        console.log('All saved best times reset.');
        return true;
    }

    toggle_hitboxes() {
        const gameScene = this._getActiveGameScene();
        if (gameScene === null || !gameScene.stpview || !gameScene.isReady) {
            console.log('toggle_hitboxes(): no active gameplay scene.');
            return false;
        }

        const stpview = gameScene.stpview;
        stpview.displayHitboxes = !stpview.displayHitboxes;
        if (!stpview.displayHitboxes && stpview.debugGraphics) {
            stpview.debugGraphics.clear();
        }
        console.log('Hitboxes:', stpview.displayHitboxes ? 'on' : 'off');
        return stpview.displayHitboxes;
    }

    _getActiveGameScene() {
        if (!this.game || !this.game.scene || !this.game.scene.keys) {
            return null;
        }

        const gameScene = this.game.scene.keys.GameScene || null;
        if (gameScene === null || !gameScene.sys || !gameScene.sys.isActive()) {
            return null;
        }

        return gameScene;
    }

    _syncLiveSaveReaders(levelName) {
        const menuScene = this.game && this.game.scene && this.game.scene.keys
            ? this.game.scene.keys.MenuScene || null
            : null;
        if (menuScene && menuScene.saveReader && menuScene.saveReader.setHighestUnlockedLevel) {
            menuScene.saveReader.setHighestUnlockedLevel(levelName);
        }

        const gameScene = this._getActiveGameScene();
        if (gameScene && gameScene.stpview && gameScene.stpview.save &&
                gameScene.stpview.save.setHighestUnlockedLevel) {
            gameScene.stpview.save.setHighestUnlockedLevel(levelName);
        }
    }
}
