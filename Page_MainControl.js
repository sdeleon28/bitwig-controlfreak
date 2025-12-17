/**
 * Main control page - groups, markers, modes, track grid
 * TO MOVE THIS PAGE: Just change pageNumber property
 * @namespace
 */
var Page_MainControl = {
    id: "main-control",
    pageNumber: 1,  // ← Change this to move to different page number

    init: function() {
        // Existing init is already done by other namespaces
        if (debug) println("Page_MainControl initialized on page " + this.pageNumber);
    },

    show: function() {
        // Register marker behaviors (one pad per marker)
        LaunchpadLane.registerMarkerBehaviors();

        // Display all main control elements (pass page number to use Pager)
        Controller.refreshGroupDisplay();
        Controller.refreshTrackGrid();  // Also registers track pad behaviors
        LaunchpadLane.refresh();

        // Mode selector (page 1 only)
        LaunchpadModeSwitcher.registerBehaviors();
        LaunchpadModeSwitcher.refresh();
    },

    hide: function() {
        // Pager handles clearing on page switch - no action needed
        // State is preserved in Controller, Twister, etc.
        if (debug) println("Hiding main control page");
    },

    handlePadPress: function(padNote) {
        // Try pad behavior system (mode buttons, track grid, markers)
        if (Launchpad.handlePadPress(padNote)) {
            return true;
        }

        // Check group selector
        var groupNum = LaunchpadQuadrant.bottomRight.getGroup(padNote);
        if (groupNum) {
            Controller.selectGroup(groupNum);
            return true;
        }

        return false;
    },

    handlePadRelease: function(padNote) {
        return Launchpad.handlePadRelease(padNote);
    }
};
