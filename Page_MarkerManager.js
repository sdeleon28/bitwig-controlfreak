/**
 * Page 2: Marker Manager (detailed marker view)
 * Same markers as page 1 but will have different behavior in future
 * @namespace
 */
var Page_MarkerManager = {
    id: "marker-manager",
    pageNumber: 2,

    /**
     * Right side action buttons (vertical layout)
     */
    actionButtons: {
        toggleMode: 89,     // Volume button
        insertSilence: 79,  // Pan button
        copy: 69,           // Send A button
        paste: 59,          // Send B button
        colors: {
            toggleMode: 53,    // Pink
            insertSilence: 49, // Purple
            copy: 37,          // Cyan
            paste: 21          // Green
        }
    },

    init: function() {
        if (debug) println("Page_MarkerManager initialized on page " + this.pageNumber);
    },

    show: function() {
        // Use ProjectExplorer for all page 2 behavior
        ProjectExplorer.registerBehaviors();
        ProjectExplorer.refresh();

        // Register and paint action buttons
        this.registerActionBehaviors();
        this.refreshActionButtons();
    },

    /**
     * Register action button behaviors for right side buttons
     */
    registerActionBehaviors: function() {
        var btns = this.actionButtons;

        // Note 89 (Volume): Toggle Object/Time Selection
        Launchpad.registerPadBehavior(btns.toggleMode, function() {
            Bitwig.invokeAction(BitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
            host.showPopupNotification("Toggle Obj/Time Mode");
        }, null, this.pageNumber);

        // Note 79 (Pan): Insert Silence (hold: Remove Time)
        Launchpad.registerPadBehavior(btns.insertSilence, function() {
            Bitwig.invokeAction(BitwigActions.INSERT_SILENCE);
            host.showPopupNotification("Insert Silence");
        }, function() {
            Bitwig.invokeAction(BitwigActions.REMOVE_TIME);
            host.showPopupNotification("Remove Time");
        }, this.pageNumber);

        // Note 69 (Send A): Copy (hold: Cut Time)
        Launchpad.registerPadBehavior(btns.copy, function() {
            Bitwig._application.copy();
            host.showPopupNotification("Copy");
        }, function() {
            Bitwig.invokeAction(BitwigActions.CUT_TIME);
            host.showPopupNotification("Cut Time");
        }, this.pageNumber);

        // Note 59 (Send B): Paste + insert cue marker
        Launchpad.registerPadBehavior(btns.paste, function() {
            Bitwig._application.paste();
            Bitwig.invokeAction(BitwigActions.INSERT_CUE_MARKER);
            host.showPopupNotification("Paste + Marker");
        }, null, this.pageNumber);

        if (debug) println("Action behaviors registered for right side buttons on page 2");
    },

    /**
     * Paint action buttons with their colors
     */
    refreshActionButtons: function() {
        var btns = this.actionButtons;
        var colors = btns.colors;

        Pager.requestPaint(this.pageNumber, btns.toggleMode, colors.toggleMode);
        Pager.requestPaint(this.pageNumber, btns.insertSilence, colors.insertSilence);
        Pager.requestPaint(this.pageNumber, btns.copy, colors.copy);
        Pager.requestPaint(this.pageNumber, btns.paste, colors.paste);
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
