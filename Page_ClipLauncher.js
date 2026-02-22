/**
 * Clip launcher page
 */
class PageClipLauncherHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.clipLauncher - ClipLauncher namespace
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.launchpadModeSwitcher - LaunchpadModeSwitcher instance
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.clipLauncher = deps.clipLauncher || null;
        this.pager = deps.pager || null;
        this.launchpadModeSwitcher = deps.launchpadModeSwitcher || null;
        this.launchpad = deps.launchpad || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.id = "clip-launcher";
        this.pageNumber = 3;
    }

    init() {
        if (this.debug) this.println("Page_ClipLauncher initialized on page " + this.pageNumber);
    }

    show() {
        if (this.clipLauncher) {
            this.clipLauncher.registerPadBehaviors();
        }

        if (this.pager) {
            this.pager.requestClearAll(this.pageNumber);
        }

        // Clear mode buttons (not used on this page)
        if (this.launchpadModeSwitcher && this.pager) {
            var modes = this.launchpadModeSwitcher.modes;
            for (var mode in modes) {
                if (modes.hasOwnProperty(mode)) {
                    this.pager.requestClear(this.pageNumber, modes[mode].note);
                }
            }
        }

        if (this.clipLauncher) {
            this.clipLauncher.refresh();
        }
    }

    hide() {
        if (this.debug) this.println("Hiding clip launcher page");
    }

    handlePadPress(padNote) {
        var row = Math.floor(padNote / 10);
        var col = padNote % 10;

        if (col < 1 || col > 8 || row < 1 || row > 8) {
            return false;
        }

        // Row 8 = scene launch buttons
        if (row === 8) {
            var sceneIndex = col - 1;
            if (this.clipLauncher) {
                this.clipLauncher.launchScene(sceneIndex);
            }
            if (this.debug) this.println("Launch scene " + sceneIndex);
            return true;
        }

        // Rows 1-7 = clip pads - delegate to Launchpad behavior system
        if (this.launchpad) {
            return this.launchpad.handlePadPress(padNote);
        }
        return false;
    }

    handlePadRelease(padNote) {
        var row = Math.floor(padNote / 10);
        if (row >= 1 && row <= 7) {
            if (this.launchpad) {
                return this.launchpad.handlePadRelease(padNote);
            }
        }
        return false;
    }
}

var Page_ClipLauncher = {};
if (typeof module !== 'undefined') module.exports = PageClipLauncherHW;
