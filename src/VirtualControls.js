// VirtualControls.js — DOM overlay providing a virtual D-pad for touch / mouse play.
// Non-source addition; sits outside Phaser entirely as a plain HTML div injected
// over the canvas.  Fires synthetic KeyboardEvents on window so Player.js and
// STPView.js need zero changes — they keep reading key.isDown as usual.

const BTN_SIZE = 65;   // px per directional button
const PAD_EDGE =  8;   // gap from screen edges

const DPAD_DEFS = [
    { label: '\u25b2', key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38, dx: 1, dy: 0 },
    { label: '\u25c4', key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37, dx: 0, dy: 1 },
    { label: '\u25ba', key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, dx: 2, dy: 1 },
    { label: '\u25bc', key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40, dx: 1, dy: 2 },
];

export default class VirtualControls {

    constructor() {
        this._overlay    = null;   // outer <div> covering the 625×625 game area
        this._dpad       = null;   // d-pad <div>
        this._toggle     = null;   // toggle <button>
        this._visible    = false;  // is the overlay currently showing?
        this._dpadOn     = true;   // is the d-pad sub-panel expanded?
        this._everShown  = false;  // has it been revealed at least once this session?

        this._build();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    // Show the overlay (and record that it has been revealed).
    show() {
        if (!this._overlay) return;
        this._overlay.style.display = 'block';
        this._visible   = true;
        this._everShown = true;
    }

    // Hide the overlay without resetting _everShown.
    hide() {
        if (!this._overlay) return;
        // Release any held keys before hiding so movement doesn't stick.
        this._releaseAll();
        this._overlay.style.display = 'none';
        this._visible = false;
    }

    isVisible()    { return this._visible;   }
    wasEverShown() { return this._everShown; }

    // Remove the overlay from the DOM (called if the game is torn down).
    destroy() {
        this._releaseAll();
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
    }

    // -------------------------------------------------------------------------
    // Build
    // -------------------------------------------------------------------------

    _build() {
        // Outer container — full 625×625, pointer-events:none so the canvas
        // beneath still receives clicks in areas not covered by buttons.
        const ov = document.createElement('div');
        ov.id = 'virtual-controls';
        ov.style.cssText =
            'position:fixed;top:0;left:0;width:625px;height:625px;' +
            'pointer-events:none;z-index:70;display:none;';
        this._overlay = ov;

        // D-pad — bottom-left corner, 3×3 button grid
        const dpad = document.createElement('div');
        dpad.style.cssText =
            'position:absolute;' +
            `bottom:${PAD_EDGE}px;left:${PAD_EDGE}px;` +
            `width:${BTN_SIZE * 3}px;height:${BTN_SIZE * 3}px;` +
            'pointer-events:none;';
        this._dpad = dpad;
        ov.appendChild(dpad);

        for (const def of DPAD_DEFS) {
            this._addArrowButton(def, dpad);
        }

        // Toggle button — top-right corner, always visible while overlay is shown
        const tog = document.createElement('button');
        tog.textContent = '\ud83d\udd79';   // 🕹
        tog.title = 'Toggle D-pad';
        tog.style.cssText =
            'position:absolute;top:5px;right:5px;width:38px;height:38px;' +
            'background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.25);' +
            'border-radius:6px;color:#fff;font-size:18px;line-height:1;' +
            'cursor:pointer;pointer-events:auto;touch-action:none;' +
            'user-select:none;-webkit-user-select:none;';
        tog.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this._dpadOn = !this._dpadOn;
            dpad.style.display = this._dpadOn ? 'block' : 'none';
            if (!this._dpadOn) this._releaseAll();
        });
        this._toggle = tog;
        ov.appendChild(tog);

        document.body.appendChild(ov);
    }

    _addArrowButton(def, parent) {
        const btn = document.createElement('button');
        btn.textContent = def.label;
        btn.style.cssText =
            'position:absolute;' +
            `left:${def.dx * BTN_SIZE}px;top:${def.dy * BTN_SIZE}px;` +
            `width:${BTN_SIZE}px;height:${BTN_SIZE}px;` +
            'background:rgba(255,255,255,0.12);' +
            'border:2px solid rgba(255,255,255,0.28);border-radius:10px;' +
            'color:rgba(255,255,255,0.85);font-size:26px;line-height:1;' +
            'cursor:pointer;pointer-events:auto;touch-action:none;' +
            'user-select:none;-webkit-user-select:none;';

        const fireDown = () => window.dispatchEvent(new KeyboardEvent('keydown', {
            key: def.key, code: def.code, keyCode: def.keyCode, which: def.keyCode,
            bubbles: true, cancelable: true,
        }));
        const fireUp = () => window.dispatchEvent(new KeyboardEvent('keyup', {
            key: def.key, code: def.code, keyCode: def.keyCode, which: def.keyCode,
            bubbles: true, cancelable: true,
        }));

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            btn.setPointerCapture(e.pointerId);
            fireDown();
        });
        btn.addEventListener('pointerup',     (e) => { e.preventDefault(); fireUp(); });
        btn.addEventListener('pointercancel', ()  => fireUp());
        btn.addEventListener('contextmenu',   (e) => e.preventDefault());

        // Visual feedback
        btn.addEventListener('pointerdown', () => {
            btn.style.background = 'rgba(255,255,255,0.28)';
        });
        btn.addEventListener('pointerup',     () => {
            btn.style.background = 'rgba(255,255,255,0.12)';
        });
        btn.addEventListener('pointercancel', () => {
            btn.style.background = 'rgba(255,255,255,0.12)';
        });

        parent.appendChild(btn);
        return btn;
    }

    // Fire keyup for all four directions — call before hiding so the player
    // doesn't keep walking after the overlay disappears.
    _releaseAll() {
        for (const def of DPAD_DEFS) {
            window.dispatchEvent(new KeyboardEvent('keyup', {
                key: def.key, code: def.code, keyCode: def.keyCode, which: def.keyCode,
                bubbles: true, cancelable: true,
            }));
        }
    }
}
