// SoundManager.js — audio playback manager
// Mirrors SoundManager.java

export default class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.current = null;
        this._currentId = null;
        this._currentLoop = true;
    }

    // Stop current music and start new track by ID.
    // Mirrors SoundManager.play(String id)
    play(id, loop = true) {
        if (this.current) {
            this.current.stop();
            this.current = null;
        }
        this._currentId = id;
        this._currentLoop = loop;
        this.current = this.scene.sound.add(id, { loop: loop });
        this.current.play();
    }

    // Stop current music.
    // Mirrors SoundManager.stop()
    stop() {
        if (this.current) {
            this.current.stop();
            this.current = null;
        }
    }

    // Play a one-shot sound effect by ID.
    sfx(id) {
        this.scene.sound.play(id);
    }

    getCurrentId() {
        return this._currentId;
    }

    getCurrentLoop() {
        return this._currentLoop;
    }
}
