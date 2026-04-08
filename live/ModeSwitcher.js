/**
 * ModeSwitcher — toggles the twister between volume and pan mode.
 *
 * Bound to two launchpad side buttons:
 *   - volume side button (note 89) -> volume mode
 *   - pan    side button (note 79) -> pan mode
 *
 * Both buttons are always-active (page-independent) so the user can flip
 * encoder modes from any page.
 */
class ModeSwitcherHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.twister
     * @param {Object} deps.host
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad;
        this.twister = deps.twister;
        this.host = deps.host;
    }

    init() {
        var self = this;
        this.launchpad.registerSideButton(this.launchpad.sideButtons.volume, function() {
            self.setMode('volume');
        }, null);
        this.launchpad.registerSideButton(this.launchpad.sideButtons.pan, function() {
            self.setMode('pan');
        }, null);
        this.refreshButtonColors();
    }

    setMode(mode) {
        this.twister.setMode(mode);
        this.refreshButtonColors();
        if (this.host) this.host.showPopupNotification("Encoders: " + mode);
    }

    refreshButtonColors() {
        var bright = this.launchpad.colors.green;
        var dim = this.launchpad.colors.off;
        var mode = this.twister.getMode();
        this.launchpad.setSideButtonColor(this.launchpad.sideButtons.volume,
            mode === 'volume' ? bright : dim);
        this.launchpad.setSideButtonColor(this.launchpad.sideButtons.pan,
            mode === 'pan' ? bright : dim);
    }
}

if (typeof module !== 'undefined') module.exports = ModeSwitcherHW;
