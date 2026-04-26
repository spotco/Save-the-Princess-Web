// ControlsInfo.js - fixed bottom-right help text outside the Phaser canvas.
// Non-source addition for browser input hints.

export default class ControlsInfo {

    static setMode(mode) {
        const element = document.getElementById('controls-info');
        if (!element) {
            return;
        }

        const moveText = (mode === 'virtual')
            ? 'move: virtual joypad'
            : 'move: arrow keys or WASD';

        element.textContent =
            moveText + '\n' +
            'exit menu: esc\n' +
            'select: space';
    }
}
