/**
 * Quick action buttons on row 5 (pads 55-58)
 * Extracted from LaunchpadLane action pad handling
 */
class QuickActionsHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.bitwigActions - BitwigActions namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.bitwig = deps.bitwig || null;
        this.bitwigActions = deps.bitwigActions || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.pads = [55, 56, 57, 58];
        this.colors = {
            toggleMode: 53,
            insertSilence: 49,
            copy: 37,
            paste: 21
        };
    }

    registerBehaviors(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        var self = this;

        this.launchpad.registerPadBehavior(55, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
            self.host.showPopupNotification("Toggle Obj/Time Mode");
        }, null, pageNumber);

        this.launchpad.registerPadBehavior(56, function() {
            self.bitwig.invokeAction(self.bitwigActions.INSERT_SILENCE);
            self.host.showPopupNotification("Insert Silence");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.REMOVE_TIME);
            self.host.showPopupNotification("Remove Time");
        }, pageNumber);

        this.launchpad.registerPadBehavior(57, function() {
            self.bitwig._application.copy();
            self.host.showPopupNotification("Copy");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.CUT_TIME);
            self.host.showPopupNotification("Cut Time");
        }, pageNumber);

        this.launchpad.registerPadBehavior(58, function() {
            self.bitwig._application.paste();
            self.bitwig.invokeAction(self.bitwigActions.INSERT_CUE_MARKER);
            self.host.showPopupNotification("Paste + Marker");
        }, null, pageNumber);
    }

    refresh(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        this.pager.requestPaint(pageNumber, 55, this.colors.toggleMode);
        this.pager.requestPaint(pageNumber, 56, this.colors.insertSilence);
        this.pager.requestPaint(pageNumber, 57, this.colors.copy);
        this.pager.requestPaint(pageNumber, 58, this.colors.paste);
    }

    clear(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        for (var i = 0; i < this.pads.length; i++) {
            this.pager.requestClear(pageNumber, this.pads[i]);
        }
    }
}

var QuickActions = {};
if (typeof module !== 'undefined') module.exports = QuickActionsHW;
