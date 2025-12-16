/**
 * Launchpad top control buttons (circular buttons above grid)
 * @namespace
 */
var LaunchpadTopButtons = {
    /**
     * Button function mappings (uses Launchpad.buttons constants)
     */
    buttons: {
        previousPage: Launchpad.buttons.top1,
        nextPage: Launchpad.buttons.top2,
        barBack: Launchpad.buttons.top3,
        barForward: Launchpad.buttons.top4,
        decreaseResolution: Launchpad.buttons.top5,  // CC 108
        increaseResolution: Launchpad.buttons.top6   // CC 109
        // Note: Modifier buttons (like duplicate) are configured in ClipGestures
    },

    /**
     * Initialize control buttons
     */
    init: function() {
        // Page buttons will be managed by Pages.refreshPageButtons()

        // Set button colors for bar navigation - use CC message for top buttons
        Launchpad.setTopButtonColor(this.buttons.barBack, Launchpad.colors.pink);
        Launchpad.setTopButtonColor(this.buttons.barForward, Launchpad.colors.pink);

        // Set button colors for resolution control
        Launchpad.setTopButtonColor(this.buttons.decreaseResolution, Launchpad.colors.cyan);
        Launchpad.setTopButtonColor(this.buttons.increaseResolution, Launchpad.colors.cyan);

        // Register button handlers
        this.registerBarNavigation();

        if (debug) println("LaunchpadTopButtons initialized");
    },

    /**
     * Register bar navigation button handlers
     */
    registerBarNavigation: function() {
        // Note: These buttons send CC messages (0xB0), not note messages
        // They will be handled in Controller.onLaunchpadMidi via handleTopButtonCC
        if (debug) {
            println("Bar navigation buttons use CC:");
            println("  Bar back: CC " + this.buttons.barBack);
            println("  Bar forward: CC " + this.buttons.barForward);
        }
    },

    /**
     * Handle top button CC message
     * @param {number} cc - CC number
     * @param {number} value - CC value (127 = pressed, 0 = released)
     * @returns {boolean} True if handled
     */
    handleTopButtonCC: function(cc, value) {
        // Check ClipGestures modifiers (only on clip launcher page)
        if (Pager.getActivePage() === ClipLauncher.pageNumber) {
            if (value === 127) {
                if (ClipGestures.handleModifierPress(cc)) return true;
            } else {
                if (ClipGestures.handleModifierRelease(cc)) return true;
            }
        }

        // Only handle button press (value > 0) for other buttons
        if (value === 0) return false;

        // Page navigation (works on all pages)
        if (cc === this.buttons.previousPage) {
            Pages.previousPage();
            return true;
        }

        if (cc === this.buttons.nextPage) {
            Pages.nextPage();
            return true;
        }

        // Bar navigation (works on all pages - page-independent)
        if (cc === this.buttons.barBack) {
            println("Bar back button pressed!");
            Bitwig.movePlayheadByBars(-1);
            return true;
        }

        if (cc === this.buttons.barForward) {
            println("Bar forward button pressed!");
            Bitwig.movePlayheadByBars(1);
            return true;
        }

        // Resolution and pagination control (only on ProjectExplorer page)
        if (Pager.getActivePage() === ProjectExplorer.pageNumber) {
            if (cc === this.buttons.decreaseResolution) {
                ProjectExplorer.decreaseResolution();
                return true;
            }
            if (cc === this.buttons.increaseResolution) {
                ProjectExplorer.increaseResolution();
                return true;
            }
            // Pagination: top7 = prev page, top8 = next page
            if (cc === ProjectExplorer.buttons.prevPage) {
                ProjectExplorer.prevPage();
                return true;
            }
            if (cc === ProjectExplorer.buttons.nextPage) {
                ProjectExplorer.nextPage();
                return true;
            }
        }

        return false;
    }
};
