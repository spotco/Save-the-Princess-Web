// Mirrors SaveReader.java
// Replaces file-based save.dat with localStorage (key: "stpsave")

export default class SaveReader {
    constructor() {
        this.levellist = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'End'];
        this.clvl = 0;
        this.maxlvl = 0;
    }

    newGame() {
        this.clvl = 0;
        this.maxlvl = 0;
        this.writeSaveCurrent(this.getHighestUnlockedLevel());
    }

    loadGame() {
        const saved = localStorage.getItem('stpsave');
        this.clvl = 0;
        this.maxlvl = 0;
        if (saved !== null) {
            const idx = this.levellist.indexOf(saved);
            if (idx !== -1) {
                this.clvl = idx;
                this.maxlvl = idx;
            }
        }
    }

    getCurrentLevel() {
        return this.levellist[this.clvl];
    }

    getHighestUnlockedLevel() {
        return this.levellist[this.maxlvl];
    }

    getLoadableLevels() {
        const maxLoadableLevelIndex = Math.min(this.maxlvl, this.levellist.length - 2);
        return this.levellist.slice(0, maxLoadableLevelIndex + 1);
    }

    setCurrentLevel(levelName) {
        const idx = this.levellist.indexOf(levelName);
        if (idx !== -1) {
            this.clvl = idx;
        }
    }

    nextLevel() {
        if (this.clvl < this.levellist.length - 1) {
            this.clvl++;
        }
    }

    completeLevel() {
        this.nextLevel();
        if (this.clvl > this.maxlvl) {
            this.maxlvl = this.clvl;
            this.writeSaveCurrent(this.getHighestUnlockedLevel());
        }
    }

    writeSaveCurrent(levelName) {
        localStorage.setItem('stpsave', levelName);
    }

    getSaveCurrent() {
        return localStorage.getItem('stpsave');
    }

    getNormalizedLevelName(levelValue) {
        if (typeof levelValue === 'number' && Number.isInteger(levelValue)) {
            if (levelValue >= 1 && levelValue <= 6) {
                return 'Level' + levelValue;
            }
            return null;
        }

        if (typeof levelValue !== 'string') {
            return null;
        }

        const trimmedValue = levelValue.trim();
        if (/^[1-6]$/.test(trimmedValue)) {
            return 'Level' + trimmedValue;
        }
        if (/^level[1-6]$/i.test(trimmedValue)) {
            return 'Level' + trimmedValue.substring(5);
        }
        if (/^end$/i.test(trimmedValue)) {
            return 'End';
        }

        return null;
    }

    setHighestUnlockedLevel(levelValue) {
        const normalizedLevelName = this.getNormalizedLevelName(levelValue);
        if (normalizedLevelName === null) {
            return null;
        }

        const idx = this.levellist.indexOf(normalizedLevelName);
        if (idx === -1) {
            return null;
        }

        this.maxlvl = idx;
        this.writeSaveCurrent(normalizedLevelName);
        return normalizedLevelName;
    }
}
