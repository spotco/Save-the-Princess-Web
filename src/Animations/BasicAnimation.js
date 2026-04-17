// Shared base for Phase 4 animation ports.

export default class BasicAnimation {

    constructor(manager, altArg) {
        this.manager = manager;
        this.altArg  = altArg;
        this.timer   = 1;
    }

    update() {
        if (this.manager.consumeSkipRequest()) {
            this.manager.done();
            return;
        }

        this.timer--;
        if (this.timer <= 0) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {}
}
