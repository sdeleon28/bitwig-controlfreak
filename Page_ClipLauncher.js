/**
 * Demo page showing page switching works
 * TO MOVE THIS PAGE: Just change pageNumber property
 * @namespace
 */
var Page_ClipLauncher = {
    id: "clip-launcher",
    pageNumber: 3,  // Clip launcher on page 3

    init: function() {
        if (debug) println("Page_ClipLauncher initialized on page " + this.pageNumber);
    },

    show: function() {
        // Register pad behaviors for this page
        ClipLauncher.registerPadBehaviors();

        // Clear this page's state using Pager
        Pager.requestClearAll(this.pageNumber);

        // Clear mode buttons (not used on this page)
        for (var mode in LaunchpadModeSwitcher.modes) {
            if (LaunchpadModeSwitcher.modes.hasOwnProperty(mode)) {
                Pager.requestClear(this.pageNumber, LaunchpadModeSwitcher.modes[mode].note);
            }
        }

        // Refresh all clip states (will use Pager internally)
        ClipLauncher.refresh();
    },

    hide: function() {
        // Pager handles clearing on page switch - no action needed
        if (debug) println("Hiding clip launcher page");
    },

    handlePadPress: function(padNote) {
        // Convert pad note to row/column
        var row = Math.floor(padNote / 10);
        var col = padNote % 10;

        // Validate: columns 1-8, rows 1-8
        if (col < 1 || col > 8 || row < 1 || row > 8) {
            return false;
        }

        // Row 8 = scene launch buttons (immediate, no hold)
        if (row === 8) {
            var sceneIndex = col - 1;
            ClipLauncher.launchScene(sceneIndex);
            if (debug) println("Launch scene " + sceneIndex);
            return true;
        }

        // Rows 1-7 = clip pads - delegate to Launchpad behavior system
        return Launchpad.handlePadPress(padNote);
    },

    handlePadRelease: function(padNote) {
        var row = Math.floor(padNote / 10);
        // Rows 1-7 = clip pads - delegate to Launchpad behavior system
        if (row >= 1 && row <= 7) {
            return Launchpad.handlePadRelease(padNote);
        }
        return false;
    }
};
