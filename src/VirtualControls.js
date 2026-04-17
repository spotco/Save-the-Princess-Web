// VirtualControls.js — DOM overlay providing a virtual D-pad for touch / mouse play.
// Non-source addition; sits outside Phaser entirely as a plain HTML div injected
// over the canvas.  Fires synthetic KeyboardEvents on window so Player.js and
// STPView.js need zero changes — they keep reading key.isDown as usual.
//
// Sliding between buttons is handled by tracking each pointer's position on
// pointermove (window) and snapping to the closest d-pad button, so dragging
// from one direction to another changes direction smoothly.

const BTN_SIZE = 65;   // px per directional button
const PAD_EDGE =  8;   // gap from screen edges
// Maximum distance from the d-pad area centre before a pointer is released.
const PAD_MARGIN = BTN_SIZE * 0.6;

const DPAD_DEFS = [
    { label: '\u25b2', key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38, dx: 1, dy: 0 },
    { label: '\u25c4', key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37, dx: 0, dy: 1 },
    { label: '\u25ba', key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, dx: 2, dy: 1 },
    { label: '\u25bc', key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40, dx: 1, dy: 2 },
];

export default class VirtualControls {

    constructor() {
        this._overlay   = null;   // outer <div> covering the 625×625 game area
        this._dpad      = null;   // d-pad <div>
        this._toggle    = null;   // toggle <button>
        this._visible   = false;  // is the overlay currently showing?
        this._dpadOn    = true;   // is the d-pad sub-panel expanded?
        this._everShown = false;  // has it been revealed at least once this session?

        // pointerId → def currently held by that pointer (null = over empty area)
        this._activePointers = new Map();

        // HTMLElement → def — built during _addArrowButton
        this._buttonEls = new Map();

        // Bound handlers kept so window listeners can be removed on destroy.
        this._onWindowMove   = (e) => this._handlePointerMove(e);
        this._onWindowUp     = (e) => this._handlePointerUp(e);

        this._build();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    show() {
        if (!this._overlay) return;
        this._overlay.style.display = 'block';
        this._visible   = true;
        this._everShown = true;
    }

    hide() {
        if (!this._overlay) return;
        this._releaseAll();
        this._overlay.style.display = 'none';
        this._visible = false;
    }

    isVisible()    { return this._visible;   }
    wasEverShown() { return this._everShown; }

    destroy() {
        this._releaseAll();
        window.removeEventListener('pointermove',  this._onWindowMove);
        window.removeEventListener('pointerup',    this._onWindowUp);
        window.removeEventListener('pointercancel',this._onWindowUp);
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

        // D-pad — bottom-left corner, 3×3 button cross
        const dpad = document.createElement('div');
        dpad.style.cssText =
            'position:absolute;' +
            `bottom:${PAD_EDGE}px;left:${PAD_EDGE}px;` +
            `width:${BTN_SIZE * 3}px;height:${BTN_SIZE * 3}px;` +
            'pointer-events:auto;touch-action:none;';
        this._dpad = dpad;
        ov.appendChild(dpad);

        for (const def of DPAD_DEFS) {
            this._addArrowButton(def, dpad);
        }

        // D-pad pointerdown — start tracking the pointer.
        dpad.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (!this._dpadOn) return;
            const def = this._closestDef(e.clientX, e.clientY);
            if (!def) return;
            this._activePointers.set(e.pointerId, def);
            this._fireKey('keydown', def);
            this._setButtonActive(def, true);
        });

        // pointermove / pointerup on window — track the pointer even when it
        // slides off the button that originally received pointerdown.
        window.addEventListener('pointermove',   this._onWindowMove);
        window.addEventListener('pointerup',     this._onWindowUp);
        window.addEventListener('pointercancel', this._onWindowUp);

        // Toggle button — top-right corner
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
            // pointer-events:none — the parent dpad div handles all pointer events
            'pointer-events:none;touch-action:none;' +
            'user-select:none;-webkit-user-select:none;';
        this._buttonEls.set(btn, def);
        parent.appendChild(btn);
        def._el = btn;   // back-reference for visual feedback
        return btn;
    }

    // -------------------------------------------------------------------------
    // Pointer tracking
    // -------------------------------------------------------------------------

    _handlePointerMove(e) {
        if (!this._activePointers.has(e.pointerId)) return;
        const oldDef = this._activePointers.get(e.pointerId);
        const newDef = this._closestDef(e.clientX, e.clientY);

        if (newDef === oldDef) return;

        // Release old direction
        if (oldDef) {
            this._fireKey('keyup', oldDef);
            this._setButtonActive(oldDef, false);
        }
        // Engage new direction (may be null if pointer left the pad area)
        if (newDef) {
            this._fireKey('keydown', newDef);
            this._setButtonActive(newDef, true);
        }
        this._activePointers.set(e.pointerId, newDef || null);
    }

    _handlePointerUp(e) {
        if (!this._activePointers.has(e.pointerId)) return;
        const def = this._activePointers.get(e.pointerId);
        if (def) {
            this._fireKey('keyup', def);
            this._setButtonActive(def, false);
        }
        this._activePointers.delete(e.pointerId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // Return the def whose button centre is closest to (x, y), or null if
    // the pointer is too far from the d-pad area.
    _closestDef(x, y) {
        if (!this._dpad) return null;
        const padRect = this._dpad.getBoundingClientRect();
        // Reject if clearly outside the d-pad region (with margin).
        if (x < padRect.left  - PAD_MARGIN || x > padRect.right  + PAD_MARGIN ||
            y < padRect.top   - PAD_MARGIN || y > padRect.bottom + PAD_MARGIN) {
            return null;
        }
        let closest = null;
        let closestDist = Infinity;
        for (const def of DPAD_DEFS) {
            if (!def._el) continue;
            const r   = def._el.getBoundingClientRect();
            const cx  = (r.left + r.right)  / 2;
            const cy  = (r.top  + r.bottom) / 2;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist < closestDist) { closestDist = dist; closest = def; }
        }
        return closest;
    }

    _fireKey(type, def) {
        window.dispatchEvent(new KeyboardEvent(type, {
            key: def.key, code: def.code, keyCode: def.keyCode, which: def.keyCode,
            bubbles: true, cancelable: true,
        }));
    }

    _setButtonActive(def, active) {
        if (def && def._el) {
            def._el.style.background = active
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(255,255,255,0.12)';
        }
    }

    // Release all keys and clear pointer tracking (called on hide / destroy).
    _releaseAll() {
        for (const [, def] of this._activePointers) {
            if (def) {
                this._fireKey('keyup', def);
                this._setButtonActive(def, false);
            }
        }
        this._activePointers.clear();
        // Also unconditionally release all four keys as a safety net.
        for (const def of DPAD_DEFS) {
            this._fireKey('keyup', def);
            this._setButtonActive(def, false);
        }
    }
}
