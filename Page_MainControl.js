/**
 * Main control page - groups, markers, modes, track grid
 * TO MOVE THIS PAGE: Just change pageNumber in constructor
 */
class PageMainControlHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpadLane - LaunchpadLane instance
     * @param {Object} deps.controller - Controller instance (set after construction)
     * @param {Object} deps.launchpadModeSwitcher - LaunchpadModeSwitcher instance (set after construction)
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.launchpadQuadrant - LaunchpadQuadrant instance
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpadLane = deps.launchpadLane || null;
        this.controller = deps.controller || null;
        this.launchpadModeSwitcher = deps.launchpadModeSwitcher || null;
        this.launchpad = deps.launchpad || null;
        this.launchpadQuadrant = deps.launchpadQuadrant || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.id = "main-control";
        this.pageNumber = 1;
    }

    init() {
        if (this.debug) this.println("Page_MainControl initialized on page " + this.pageNumber);
    }

    show() {
        // Register marker behaviors (one pad per marker)
        if (this.launchpadLane) {
            this.launchpadLane.registerMarkerBehaviors();
            this.launchpadLane.registerActionBehaviors();
        }

        // Display all main control elements
        if (this.controller) {
            this.controller.refreshGroupDisplay();
            this.controller.refreshTrackGrid();
        }
        if (this.launchpadLane) {
            this.launchpadLane.refresh();
        }

        // Mode selector (page 1 only)
        if (this.launchpadModeSwitcher) {
            this.launchpadModeSwitcher.registerBehaviors();
            this.launchpadModeSwitcher.refresh();
        }
    }

    hide() {
        if (this.debug) this.println("Hiding main control page");
    }

    handlePadPress(padNote) {
        // Try pad behavior system (mode buttons, track grid, markers)
        if (this.launchpad && this.launchpad.handlePadPress(padNote)) {
            return true;
        }

        // Check group selector
        if (this.launchpadQuadrant) {
            var groupNum = this.launchpadQuadrant.bottomRight.getGroup(padNote);
            if (groupNum) {
                if (this.controller) {
                    this.controller.selectGroup(groupNum);
                }
                return true;
            }
        }

        return false;
    }

    handlePadRelease(padNote) {
        if (this.launchpad) {
            return this.launchpad.handlePadRelease(padNote);
        }
        return false;
    }
}

var Page_MainControl = {};
if (typeof module !== 'undefined') module.exports = PageMainControlHW;
