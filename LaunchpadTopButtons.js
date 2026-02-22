/**
 * Launchpad top control buttons (circular buttons above grid)
 */
class LaunchpadTopButtonsHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.pages - Pages namespace
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.clipGestures - ClipGestures instance
     * @param {Object} deps.clipLauncher - ClipLauncher namespace
     * @param {Object} deps.projectExplorer - ProjectExplorer namespace
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.pages = deps.pages || null;
        this.bitwig = deps.bitwig || null;
        this.clipGestures = deps.clipGestures || null;
        this.clipLauncher = deps.clipLauncher || null;
        this.projectExplorer = deps.projectExplorer || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        var buttons = this.launchpad ? this.launchpad.buttons : {};

        // Button function mappings
        this.buttons = {
            previousPage: buttons.top1,
            nextPage: buttons.top2,
            barBack: buttons.top3,
            barForward: buttons.top4,
            decreaseResolution: buttons.top5,
            increaseResolution: buttons.top6
        };

        if (this.debug) this.println("LaunchpadTopButtons constructed");
    }

    /**
     * Initialize control buttons (sends MIDI to set LED colors)
     */
    init() {
        if (!this.launchpad) return;

        // Set button colors for bar navigation
        this.launchpad.setTopButtonColor(this.buttons.barBack, this.launchpad.colors.pink);
        this.launchpad.setTopButtonColor(this.buttons.barForward, this.launchpad.colors.pink);

        // Set button colors for resolution control
        this.launchpad.setTopButtonColor(this.buttons.decreaseResolution, this.launchpad.colors.cyan);
        this.launchpad.setTopButtonColor(this.buttons.increaseResolution, this.launchpad.colors.cyan);

        if (this.debug) this.println("LaunchpadTopButtons initialized");
    }

    /**
     * Handle top button CC message
     * @param {number} cc - CC number
     * @param {number} value - CC value (127 = pressed, 0 = released)
     * @returns {boolean} True if handled
     */
    handleTopButtonCC(cc, value) {
        // Check ClipGestures modifiers (only on clip launcher page)
        if (this.clipLauncher && this.pager &&
            this.pager.getActivePage() === this.clipLauncher.pageNumber) {
            if (value === 127) {
                if (this.clipGestures.handleModifierPress(cc)) return true;
            } else {
                if (this.clipGestures.handleModifierRelease(cc)) return true;
            }
        }

        // Only handle button press (value > 0) for other buttons
        if (value === 0) return false;

        // Page navigation (works on all pages)
        if (cc === this.buttons.previousPage) {
            this.pages.previousPage();
            return true;
        }

        if (cc === this.buttons.nextPage) {
            this.pages.nextPage();
            return true;
        }

        // Bar navigation (works on all pages - page-independent)
        if (cc === this.buttons.barBack) {
            this.println("Bar back button pressed!");
            this.bitwig.movePlayheadByBars(-1);
            return true;
        }

        if (cc === this.buttons.barForward) {
            this.println("Bar forward button pressed!");
            this.bitwig.movePlayheadByBars(1);
            return true;
        }

        // Resolution and pagination control (only on ProjectExplorer page)
        if (this.projectExplorer && this.pager &&
            this.pager.getActivePage() === this.projectExplorer.pageNumber) {
            if (cc === this.buttons.decreaseResolution) {
                this.projectExplorer.decreaseResolution();
                return true;
            }
            if (cc === this.buttons.increaseResolution) {
                this.projectExplorer.increaseResolution();
                return true;
            }
            // Pagination: top7 = prev page, top8 = next page
            if (cc === this.projectExplorer.buttons.prevPage) {
                this.projectExplorer.prevPage();
                return true;
            }
            if (cc === this.projectExplorer.buttons.nextPage) {
                this.projectExplorer.nextPage();
                return true;
            }
        }

        return false;
    }
}

var LaunchpadTopButtons = {};
if (typeof module !== 'undefined') module.exports = LaunchpadTopButtonsHW;
