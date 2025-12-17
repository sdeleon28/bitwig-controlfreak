/**
 * Page 2: Marker Manager (detailed marker view)
 * Same markers as page 1 but will have different behavior in future
 * @namespace
 */
var Page_MarkerManager = {
    id: "marker-manager",
    pageNumber: 2,

    init: function() {
        if (debug) println("Page_MarkerManager initialized on page " + this.pageNumber);
    },

    show: function() {
        // Use ProjectExplorer for all page 2 behavior
        ProjectExplorer.registerBehaviors();
        ProjectExplorer.refresh();
    },

    hide: function() {
        // Clear pagination buttons when leaving this page
        Launchpad.setTopButtonColor(ProjectExplorer.buttons.prevPage, 0);
        Launchpad.setTopButtonColor(ProjectExplorer.buttons.nextPage, 0);
        // Note: Time select gesture is NOT reset here to allow cross-page selection
        // It will be reset by main page navigation (Pages.switchToPage)
        if (debug) println("Hiding marker manager page");
    },

    handlePadPress: function(padNote) {
        // Check for time select modifier (Record Arm button)
        if (padNote === ProjectExplorer.modifiers.timeSelect) {
            ProjectExplorer.handleTimeSelectModifierPress();
            return true;
        }

        // Check for copy select modifier (Solo button)
        if (padNote === ProjectExplorer.modifiers.copySelect) {
            ProjectExplorer.handleCopySelectModifierPress();
            return true;
        }

        // If time select gesture is active, handle as gesture input
        if (ProjectExplorer._timeSelectActive) {
            ProjectExplorer.handleTimeSelectPadPress(padNote);
            return true;
        }

        // If copy select gesture is active, handle as gesture input
        if (ProjectExplorer._copySelectActive) {
            ProjectExplorer.handleCopySelectPadPress(padNote);
            return true;
        }

        return Launchpad.handlePadPress(padNote);
    },

    handlePadRelease: function(padNote) {
        // Check for time select modifier release
        if (padNote === ProjectExplorer.modifiers.timeSelect) {
            ProjectExplorer.handleTimeSelectModifierRelease();
            return true;
        }

        // Check for copy select modifier release
        if (padNote === ProjectExplorer.modifiers.copySelect) {
            ProjectExplorer.handleCopySelectModifierRelease();
            return true;
        }

        // Block grid pad releases during time selection (prevents jumpToBar trigger)
        if (ProjectExplorer._timeSelectActive) {
            var padIndex = ProjectExplorer.pads.indexOf(padNote);
            if (padIndex !== -1) return true;  // Consume release, don't trigger click
        }

        // Block grid pad releases during copy selection
        if (ProjectExplorer._copySelectActive) {
            var padIndex = ProjectExplorer.pads.indexOf(padNote);
            if (padIndex !== -1) return true;  // Consume release, don't trigger click
        }

        return Launchpad.handlePadRelease(padNote);
    }
};
