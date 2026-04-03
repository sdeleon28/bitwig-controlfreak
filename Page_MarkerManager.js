/**
 * Page 2: Marker Manager (detailed marker view)
 * Same markers as page 1 but will have different behavior in future
 */
class PageMarkerManagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.projectExplorer - ProjectExplorer namespace
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.bitwigActions - BitwigActions constants
     * @param {Object} deps.host - Bitwig host object
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.pager = deps.pager || null;
        this.launchpad = deps.launchpad || null;
        this.projectExplorer = deps.projectExplorer || null;
        this.bitwig = deps.bitwig || null;
        this.bitwigActions = deps.bitwigActions || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.id = "marker-manager";
        this.pageNumber = 2;

        this.actionButtons = {
            toggleMode: 89,     // Volume button
            insertSilence: 79,  // Pan button
            copy: 69,           // Send A button
            paste: 59,          // Send B button
            stop: 49,           // Stop/Solo/Mute button
            toggleLoop: 39,     // Mute button
            toggleMetronome: 29, // Solo button
            colors: {
                toggleMode: 53,    // Pink
                insertSilence: 49, // Purple
                copy: 37,          // Cyan
                paste: 21,         // Green
                stop: 5,           // Red
                toggleLoop: 37,    // Cyan
                toggleMetronome: 13 // Yellow
            }
        };
    }

    init() {
        if (this.debug) this.println("Page_MarkerManager initialized on page " + this.pageNumber);
    }

    show() {
        // Use ProjectExplorer for all page 2 behavior
        if (this.projectExplorer) {
            this.projectExplorer.registerBehaviors();
            this.projectExplorer.autoResolution();
            this.projectExplorer.refresh();
        }

        // Register and paint action buttons
        this.registerActionBehaviors();
        this.refreshActionButtons();

        // Sync loop/metronome lights with Bitwig state
        var self = this;
        if (this.bitwig) {
            this.bitwig._onLoopChanged = function() { self.refreshActionButtons(); };
            this.bitwig._onMetronomeChanged = function() { self.refreshActionButtons(); };
        }
    }

    registerActionBehaviors() {
        var self = this;
        var btns = this.actionButtons;

        if (!this.launchpad) return;

        // Note 89 (Volume): Toggle Object/Time Selection
        this.launchpad.registerPadBehavior(btns.toggleMode, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
            self.host.showPopupNotification("Toggle Obj/Time Mode");
        }, null, this.pageNumber);

        // Note 79 (Pan): Insert Silence (hold: Remove Time)
        this.launchpad.registerPadBehavior(btns.insertSilence, function() {
            self.bitwig.invokeAction(self.bitwigActions.INSERT_SILENCE);
            self.host.showPopupNotification("Insert Silence");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.REMOVE_TIME);
            self.host.showPopupNotification("Remove Time");
        }, this.pageNumber);

        // Note 69 (Send A): Copy (hold: Cut Time)
        this.launchpad.registerPadBehavior(btns.copy, function() {
            self.bitwig._application.copy();
            self.host.showPopupNotification("Copy");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.CUT_TIME);
            self.host.showPopupNotification("Cut Time");
        }, this.pageNumber);

        // Note 59 (Send B): Paste + insert cue marker
        this.launchpad.registerPadBehavior(btns.paste, function() {
            self.bitwig._application.paste();
            self.bitwig.invokeAction(self.bitwigActions.INSERT_CUE_MARKER);
            self.host.showPopupNotification("Paste + Marker");
        }, null, this.pageNumber);

        // Note 49 (Stop/Solo/Mute): Stop transport
        this.launchpad.registerPadBehavior(btns.stop, function() {
            self.bitwig.invokeAction(self.bitwigActions.STOP);
            self.host.showPopupNotification("Stop");
        }, null, this.pageNumber);

        // Note 39 (Mute): Toggle loop
        this.launchpad.registerPadBehavior(btns.toggleLoop, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_ARRANGER_LOOP);
            self.host.showPopupNotification("Toggle Loop");
        }, null, this.pageNumber);

        // Note 29 (Solo): Toggle metronome
        this.launchpad.registerPadBehavior(btns.toggleMetronome, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_METRONOME);
            self.host.showPopupNotification("Toggle Metronome");
        }, null, this.pageNumber);

        if (this.debug) this.println("Action behaviors registered for right side buttons on page 2");
    }

    refreshActionButtons() {
        if (!this.pager) return;
        var btns = this.actionButtons;
        var colors = btns.colors;

        this.pager.requestPaint(this.pageNumber, btns.toggleMode, colors.toggleMode);
        this.pager.requestPaint(this.pageNumber, btns.insertSilence, colors.insertSilence);
        this.pager.requestPaint(this.pageNumber, btns.copy, colors.copy);
        this.pager.requestPaint(this.pageNumber, btns.paste, colors.paste);
        this.pager.requestPaint(this.pageNumber, btns.stop, colors.stop);
        var loopColor = this.bitwig && this.bitwig.isLoopEnabled ? colors.toggleLoop : 0;
        var metronomeColor = this.bitwig && this.bitwig.isMetronomeEnabled ? colors.toggleMetronome : 0;
        this.pager.requestPaint(this.pageNumber, btns.toggleLoop, loopColor);
        this.pager.requestPaint(this.pageNumber, btns.toggleMetronome, metronomeColor);
    }

    hide() {
        // Clear pagination buttons when leaving this page
        if (this.launchpad && this.projectExplorer) {
            this.launchpad.setTopButtonColor(this.projectExplorer.buttons.prevPage, 0);
            this.launchpad.setTopButtonColor(this.projectExplorer.buttons.nextPage, 0);
        }
        // Unregister state change callbacks
        if (this.bitwig) {
            this.bitwig._onLoopChanged = null;
            this.bitwig._onMetronomeChanged = null;
        }
        if (this.debug) this.println("Hiding marker manager page");
    }

    handlePadPress(padNote) {
        if (!this.projectExplorer) {
            return this.launchpad ? this.launchpad.handlePadPress(padNote) : false;
        }

        // Check for time select modifier (Record Arm button)
        if (padNote === this.projectExplorer.modifiers.timeSelect) {
            this.projectExplorer.handleTimeSelectModifierPress();
            return true;
        }

        // If time select gesture is active, handle as gesture input
        if (this.projectExplorer._timeSelectActive) {
            this.projectExplorer.handleTimeSelectPadPress(padNote);
            return true;
        }

        return this.launchpad ? this.launchpad.handlePadPress(padNote) : false;
    }

    handlePadRelease(padNote) {
        if (!this.projectExplorer) {
            return this.launchpad ? this.launchpad.handlePadRelease(padNote) : false;
        }

        // Check for time select modifier release
        if (padNote === this.projectExplorer.modifiers.timeSelect) {
            this.projectExplorer.handleTimeSelectModifierRelease();
            return true;
        }

        // Block grid pad releases during time selection
        if (this.projectExplorer._timeSelectActive) {
            var padIndex = this.projectExplorer.pads.indexOf(padNote);
            if (padIndex !== -1) return true;
        }

        return this.launchpad ? this.launchpad.handlePadRelease(padNote) : false;
    }
}

var Page_MarkerManager = {};
if (typeof module !== 'undefined') module.exports = PageMarkerManagerHW;
