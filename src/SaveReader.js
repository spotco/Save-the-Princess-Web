// Mirrors SaveReader.java
// Replaces file-based save.dat with localStorage (key: "stpsave")

export default class SaveReader {
    constructor() {
        this.levellist = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'End'];
        this.clvl = 0;
    }

    newGame() {
        this.clvl = 0;
        this.writeSaveCurrent(this.getCurrentLevel());
    }

    loadGame() {
        const saved = localStorage.getItem('stpsave');
        this.clvl = 0;
        if (saved !== null) {
            const idx = this.levellist.indexOf(saved);
            if (idx !== -1) {
                this.clvl = idx;
            }
        }
    }

    getCurrentLevel() {
        return this.levellist[this.clvl];
    }

    nextLevel() {
        this.clvl++;
        this.writeSaveCurrent(this.getCurrentLevel());
    }

    writeSaveCurrent(levelName) {
        localStorage.setItem('stpsave', levelName);
    }

    getSaveCurrent() {
        return localStorage.getItem('stpsave');
    }
}
