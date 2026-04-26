// TimerCounter.js — in-game timer and best-time persistence
// Mirrors TimerCounter.java (originally a TimerTask ticking every 10ms;
// here driven by tick(delta) called from the Phaser update loop)

// Developer record times in centiseconds (abs units)
const REC_TIMES = {
    Level1: 5095,
    Level2: 5939,
    Level3: 6357,
    Level4: 24593,
    Level5: 19602,
    Level6: 13083,
};

const LS_KEY = 'stptimes';
const NO_TIME_RECORDED = 999999;
const NO_TIME_DISPLAY = '0:00:00';

export default class TimerCounter {
    constructor(levelName) {
        this.abs   = 0;
        this.tenms = 0;
        this.sec   = 0;
        this.min   = 0;
        this._running = false;
        this._accum   = 0; // ms remainder between ticks

        // Load stats from localStorage (mirrors reading times.dat)
        const raw = localStorage.getItem(LS_KEY);
        this.stats = raw ? JSON.parse(raw) : {};
        // Ensure every level has an entry
        for (const k of Object.keys(REC_TIMES)) {
            if (!(k in this.stats)) this.stats[k] = NO_TIME_RECORDED;
        }
    }

    start()  { this._running = true; }
    stop()   { this._running = false; }
    reset()  { this.abs = this.tenms = this.sec = this.min = 0; this._accum = 0; }

    // Call from Phaser update loop with delta in ms.
    // Mirrors TimerCounter.run() which fired every 10ms.
    tick(delta) {
        if (!this._running) return;
        this._accum += delta;
        while (this._accum >= 10) {
            this._accum -= 10;
            this.tenms++;
            this.abs++;
            if (this.tenms === 100) { this.tenms = 0; this.sec++; }
            if (this.sec   === 60)  { this.sec   = 0; this.min++; }
        }
    }

    // "min:ss:cs" for current run
    getCurTime() {
        const s  = String(this.sec).padStart(2, '0');
        const cs = String(this.tenms).padStart(2, '0');
        return `${this.min}:${s}:${cs}`;
    }

    // Formatted best time for a level from localStorage
    gettime(name) {
        const sto = this.stats[name] || NO_TIME_RECORDED;
        if (TimerCounter._isUnsetTime(sto)) {
            return NO_TIME_DISPLAY;
        }
        return TimerCounter._formatTime(sto);
    }

    gettimeraw(name) {
        return this.stats[name] || NO_TIME_RECORDED;
    }

    hasRecordedTime(name) {
        return !TimerCounter._isUnsetTime(this.gettimeraw(name));
    }

    // Persist if new time beats stored best (mirrors writetime())
    writetime(name, time) {
        if (!(name in this.stats) || time < this.stats[name]) {
            this.stats[name] = time;
            localStorage.setItem(LS_KEY, JSON.stringify(this.stats));
        }
    }

    // Developer record time in centiseconds for a level
    getRecTime(name) {
        return REC_TIMES[name] || NO_TIME_RECORDED;
    }

    getRecTimeDisplay(name) {
        return TimerCounter._formatTime(this.getRecTime(name));
    }

    static _isUnsetTime(sto) {
        return typeof sto !== 'number' || !Number.isFinite(sto) || sto >= NO_TIME_RECORDED;
    }

    static _formatTime(sto) {
        const cs  = sto % 100;
        const sec = Math.floor(sto % 6000 / 100);
        const min = Math.floor(sto / 6000);
        return `${min}:${String(sec).padStart(2,'0')}:${String(cs).padStart(2,'0')}`;
    }

    static resetAllSavedTimes() {
        const stats = {};
        for (const k of Object.keys(REC_TIMES)) {
            stats[k] = NO_TIME_RECORDED;
        }
        localStorage.setItem(LS_KEY, JSON.stringify(stats));
    }

    static setSavedTimeRaw(name, time) {
        if (!(name in REC_TIMES)) {
            return false;
        }

        const raw = localStorage.getItem(LS_KEY);
        const stats = raw ? JSON.parse(raw) : {};
        for (const k of Object.keys(REC_TIMES)) {
            if (!(k in stats)) {
                stats[k] = NO_TIME_RECORDED;
            }
        }
        stats[name] = time;
        localStorage.setItem(LS_KEY, JSON.stringify(stats));
        return true;
    }
}
