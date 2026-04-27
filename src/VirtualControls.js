// VirtualControls.js - DOM overlay providing a virtual D-pad for touch / mouse play.
// Non-source addition; sits outside Phaser entirely as a plain HTML div injected
// over the page.  Fires synthetic KeyboardEvents on window so Player.js and
// STPView.js need zero changes - they keep reading key.isDown as usual.
//
// Sliding between buttons is handled by tracking each pointer's position on
// pointermove (window) and snapping to the closest d-pad button, so dragging
// from one direction to another changes direction smoothly.

const BTN_SIZE = 65;   // px per directional button
const PAD_EDGE =  8;   // gap from screen edges
const PAD_SIZE = BTN_SIZE * 3;
// Maximum distance from the d-pad area centre before a pointer is released.
const PAD_MARGIN = BTN_SIZE * 0.6;

const DPAD_KEY_DEFS = {
    up:    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
    left:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    down:  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
};

const DPAD_DEFS = [
    { label: '\u2196', keys: [DPAD_KEY_DEFS.up,   DPAD_KEY_DEFS.left],  dx: 0, dy: 0 },
    { label: '\u25b2', keys: [DPAD_KEY_DEFS.up],                         dx: 1, dy: 0 },
    { label: '\u2197', keys: [DPAD_KEY_DEFS.up,   DPAD_KEY_DEFS.right], dx: 2, dy: 0 },
    { label: '\u25c4', keys: [DPAD_KEY_DEFS.left],                       dx: 0, dy: 1 },
    { label: '\u25cf', keys: [],                                         dx: 1, dy: 1 },
    { label: '\u25ba', keys: [DPAD_KEY_DEFS.right],                      dx: 2, dy: 1 },
    { label: '\u2199', keys: [DPAD_KEY_DEFS.down, DPAD_KEY_DEFS.left],  dx: 0, dy: 2 },
    { label: '\u25bc', keys: [DPAD_KEY_DEFS.down],                       dx: 1, dy: 2 },
    { label: '\u2198', keys: [DPAD_KEY_DEFS.down, DPAD_KEY_DEFS.right], dx: 2, dy: 2 },
];

export default class VirtualControls {

    constructor() {
        this._overlay = null;   // outer <div> covering the viewport
        this._dpad    = null;   // d-pad <div>
        this._visible = false;  // is the overlay currently showing?
        this._isHiding = false; // prevents synthetic key releases from re-entering hide()
        this._trackingInitialPointer = false;

        // pointerId -> def currently held by that pointer (null = over empty area)
        this._activePointers = new Map();

        // HTMLElement -> def - built during _addArrowButton
        this._buttonEls = new Map();

        // Bound handlers kept so window listeners can be removed on destroy.
        this._onWindowMove = (e) => this._handlePointerMove(e);
        this._onWindowUp   = (e) => this._handlePointerUp(e);

        this._build();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    show() {
        if (!this._overlay) return;
        this._syncOverlayToViewport();
        this._overlay.style.display = 'block';
        this._visible = true;
    }

    showAtPointerAndTrack(pointer) {
        if (!this._overlay) return;
        const viewportRect = this._syncOverlayToViewport();
        const point = this._pointerToViewportPoint(pointer);
        if (!point) {
            this.show();
            return;
        }

        this._moveDpadToBottomLeftViewportCorner(viewportRect);
        this._overlay.style.display = 'block';
        this._visible = true;

        const pointerId = this._pointerId(pointer);
        if (Number.isFinite(pointerId)) {
            this._activePointers.set(pointerId, null);
        }
        this._trackingInitialPointer = true;
    }

    hide() {
        if (!this._overlay || this._isHiding) return;
        this._isHiding = true;
        this._visible = false;
        this._overlay.style.display = 'none';
        this._releaseAll();
        this._isHiding = false;
    }

    isVisible() { return this._visible; }

    containsEventTarget(target) {
        return !!(this._overlay && target && this._overlay.contains(target));
    }

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
        // Outer container - full viewport, pointer-events:none so the page/canvas
        // beneath still receives clicks in areas not covered by buttons.
        const ov = document.createElement('div');
        ov.id = 'virtual-controls';
        ov.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
            'pointer-events:none;z-index:90;display:none;' +
            'user-select:none;-webkit-user-select:none;-ms-user-select:none;' +
            '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;';
        this._overlay = ov;

        // D-pad - 3x3 button grid, snapped to the bottom-left corner.
        const dpad = document.createElement('div');
        dpad.style.cssText =
            'position:absolute;' +
            `bottom:${PAD_EDGE}px;left:${PAD_EDGE}px;` +
            `width:${PAD_SIZE}px;height:${PAD_SIZE}px;` +
            'pointer-events:auto;touch-action:none;' +
            'user-select:none;-webkit-user-select:none;-ms-user-select:none;' +
            '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;';
        this._dpad = dpad;
        ov.appendChild(dpad);

        for (const def of DPAD_DEFS) {
            this._addArrowButton(def, dpad);
        }

        // D-pad pointerdown - start tracking the pointer.
        dpad.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const def = this._closestDef(e.clientX, e.clientY);
            if (!def) return;
            this._activePointers.set(e.pointerId, def);
            this._fireKeys('keydown', def);
            this._setButtonActive(def, true);
        });
        dpad.addEventListener('click', (e) => this._consumeControlEvent(e));
        this._blockNativeTouchGestures(dpad);

        // pointermove / pointerup on window - track the pointer even when it
        // slides off the button that originally received pointerdown.
        window.addEventListener('pointermove',   this._onWindowMove);
        window.addEventListener('pointerup',     this._onWindowUp);
        window.addEventListener('pointercancel', this._onWindowUp);

        document.body.appendChild(ov);
    }

    _addArrowButton(def, parent) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.textContent = def.label;
        btn.style.cssText =
            'position:absolute;' +
            `left:${def.dx * BTN_SIZE}px;top:${def.dy * BTN_SIZE}px;` +
            `width:${BTN_SIZE}px;height:${BTN_SIZE}px;` +
            'background:rgba(255,255,255,0.12);' +
            'border:2px solid rgba(255,255,255,0.28);border-radius:10px;' +
            'color:rgba(255,255,255,0.85);font-size:26px;line-height:1;' +
            // pointer-events:none - the parent dpad div handles all pointer events
            'pointer-events:none;touch-action:none;' +
            'user-select:none;-webkit-user-select:none;-ms-user-select:none;' +
            '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;' +
            '-webkit-user-drag:none;';
        this._buttonEls.set(btn, def);
        parent.appendChild(btn);
        def._el = btn;   // back-reference for visual feedback
        return btn;
    }

    // -------------------------------------------------------------------------
    // Pointer tracking
    // -------------------------------------------------------------------------

    _handlePointerMove(e) {
        if (!this._activePointers.has(e.pointerId)) {
            if (!this._trackingInitialPointer || !this._isPointerHeld(e)) return;
            this._activePointers.set(e.pointerId, null);
            this._trackingInitialPointer = false;
        } else if (this._trackingInitialPointer) {
            this._trackingInitialPointer = false;
        }
        const oldDef = this._activePointers.get(e.pointerId);
        const newDef = this._closestDef(e.clientX, e.clientY);

        if (newDef === oldDef) return;

        // Release old direction
        if (oldDef) {
            this._fireKeys('keyup', oldDef);
            this._setButtonActive(oldDef, false);
        }
        // Engage new direction (may be null if pointer left the pad area).
        // The middle button has no keys, so it acts as neutral/none.
        if (newDef) {
            this._fireKeys('keydown', newDef);
            this._setButtonActive(newDef, true);
        }
        this._activePointers.set(e.pointerId, newDef || null);
    }

    _handlePointerUp(e) {
        this._trackingInitialPointer = false;
        if (!this._activePointers.has(e.pointerId)) return;
        const def = this._activePointers.get(e.pointerId);
        if (def) {
            this._fireKeys('keyup', def);
            this._setButtonActive(def, false);
        }
        this._activePointers.delete(e.pointerId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _syncOverlayToViewport() {
        const rect = {
            left:   0,
            top:    0,
            width:  window.innerWidth,
            height: window.innerHeight
        };
        this._overlay.style.left   = '0px';
        this._overlay.style.top    = '0px';
        this._overlay.style.width  = `${rect.width}px`;
        this._overlay.style.height = `${rect.height}px`;
        return rect;
    }

    _moveDpadToBottomLeftViewportCorner(viewportRect) {
        if (!this._dpad) return;
        const rect = viewportRect || this._syncOverlayToViewport();
        const maxTop  = Math.max(PAD_EDGE, rect.height - PAD_SIZE - PAD_EDGE);
        const left = PAD_EDGE;
        const top  = maxTop;
        this._dpad.style.left   = `${left}px`;
        this._dpad.style.top    = `${top}px`;
        this._dpad.style.bottom = 'auto';
    }

    _blockNativeTouchGestures(element) {
        element.addEventListener('contextmenu', (e) => this._consumeControlEvent(e));
        element.addEventListener('selectstart', (e) => this._consumeControlEvent(e));
        element.addEventListener('dragstart',   (e) => this._consumeControlEvent(e));
        element.addEventListener('touchstart',  (e) => this._consumeControlEvent(e), { passive: false });
        element.addEventListener('touchmove',   (e) => this._consumeControlEvent(e), { passive: false });
        element.addEventListener('touchend',    (e) => this._consumeControlEvent(e), { passive: false });
    }

    _consumeControlEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    _pointerToViewportPoint(pointer) {
        if (!pointer) return null;
        const event = pointer.event || pointer;
        if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            return {
                x: event.clientX,
                y: event.clientY
            };
        }

        const canvas = document.querySelector('canvas');
        if (canvas && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: rect.left + pointer.x * rect.width  / 625,
                y: rect.top  + pointer.y * rect.height / 625
            };
        }

        return null;
    }

    _pointerId(pointer) {
        if (!pointer) return NaN;
        const event = pointer.event || {};
        if (Number.isFinite(event.pointerId)) {
            return event.pointerId;
        }
        if (Number.isFinite(pointer.id)) {
            return pointer.id;
        }
        return NaN;
    }

    _isPointerHeld(e) {
        return e.buttons !== 0 || e.pointerType === 'touch';
    }

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
            const r    = def._el.getBoundingClientRect();
            const cx   = (r.left + r.right)  / 2;
            const cy   = (r.top  + r.bottom) / 2;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist < closestDist) { closestDist = dist; closest = def; }
        }
        return closest;
    }

    _fireKeys(type, def) {
        if (!def || !def.keys) return;
        for (const keyDef of def.keys) {
            window.dispatchEvent(new KeyboardEvent(type, {
                key: keyDef.key, code: keyDef.code, keyCode: keyDef.keyCode, which: keyDef.keyCode,
                bubbles: true, cancelable: true,
            }));
        }
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
                this._fireKeys('keyup', def);
                this._setButtonActive(def, false);
            }
        }
        this._activePointers.clear();
        this._trackingInitialPointer = false;
        // Also unconditionally release all four real direction keys as a safety net.
        for (const keyName of Object.keys(DPAD_KEY_DEFS)) {
            const keyDef = DPAD_KEY_DEFS[keyName];
            window.dispatchEvent(new KeyboardEvent('keyup', {
                key: keyDef.key, code: keyDef.code, keyCode: keyDef.keyCode, which: keyDef.keyCode,
                bubbles: true, cancelable: true,
            }));
        }
        for (const def of DPAD_DEFS) {
            this._setButtonActive(def, false);
        }
    }
}
