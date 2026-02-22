/**
 * Page 4: Debug Actions for testing copy workflow
 * Each pad triggers a single action with a growl notification
 */
class PageDebugActionsHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.bitwigActions - BitwigActions constants
     * @param {Object} deps.host - Bitwig host object
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.pager = deps.pager || null;
        this.bitwig = deps.bitwig || null;
        this.bitwigActions = deps.bitwigActions || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.id = "debug-actions";
        this.pageNumber = 4;
    }

    init() {
        if (this.debug) this.println("Page_DebugActions initialized on page " + this.pageNumber);
    }

    show() {
        this.refresh();
    }

    hide() {
        if (this.debug) this.println("Hiding debug actions page");
    }

    refresh() {
        // Color the action pads amber to show they're active
        var amberPads = [81, 82, 83, 84, 85, 86, 87, 88, 71, 72, 73, 74];
        for (var i = 0; i < amberPads.length; i++) {
            this.pager.requestPaint(this.pageNumber, amberPads[i], 5); // amber
        }

        // Color the building blocks row pink for testing mode actions
        var pinkPads = [61, 62, 63, 64];
        for (var i = 0; i < pinkPads.length; i++) {
            this.pager.requestPaint(this.pageNumber, pinkPads[i], 53); // pink
        }

        // Color the loop-based time selection row green
        var greenPads = [51, 52, 53, 54];
        for (var i = 0; i < greenPads.length; i++) {
            this.pager.requestPaint(this.pageNumber, greenPads[i], 21); // green
        }

        // Yellow pad for loop bounds -> time selection
        this.pager.requestPaint(this.pageNumber, 55, 13); // yellow

        // Cyan pad for detective script
        this.pager.requestPaint(this.pageNumber, 56, 37); // cyan

        // Purple pad for Insert Silence test
        this.pager.requestPaint(this.pageNumber, 57, 49); // purple
    }

    handlePadPress(padNote) {
        switch (padNote) {
            // Top row (81-88)
            case 81: // Time selection TARGET (bars 8-12)
                this.bitwig.setTimeSelection(32, 48);
                this.host.showPopupNotification("Time sel: TARGET (bar 8-12)");
                return true;

            case 82: // Toggle Object/Time Selection mode
                this.bitwig.invokeAction(this.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                this.host.showPopupNotification("Toggle Obj/Time Mode");
                return true;

            case 83: // Insert Silence
                this.bitwig.invokeAction(this.bitwigActions.INSERT_SILENCE);
                this.host.showPopupNotification("Insert Silence");
                return true;

            case 84: // Time selection SOURCE (bars 0-4)
                this.bitwig.setTimeSelection(0, 16);
                this.host.showPopupNotification("Time sel: SOURCE (bar 0-4)");
                return true;

            case 85: // Split
                this.bitwig.invokeAction(this.bitwigActions.SPLIT);
                this.host.showPopupNotification("Split");
                return true;

            case 86: // Switch to Object mode
                this.bitwig.invokeAction(this.bitwigActions.TOOL_POINTER);
                this.host.showPopupNotification("Tool: Object Selection");
                return true;

            case 87: // Select All
                this.bitwig._application.selectAll();
                this.host.showPopupNotification("Select All");
                return true;

            case 88: // Loop Selection action
                this.bitwig.invokeAction(this.bitwigActions.LOOP_SELECTION);
                this.host.showPopupNotification("Loop Selection");
                return true;

            // Second row (71-78)
            case 71: // Copy
                this.bitwig._application.copy();
                this.host.showPopupNotification("Copy");
                return true;

            case 72: // Move playhead to bar 8
                this.bitwig.setPlayheadPosition(32);
                this.host.showPopupNotification("Playhead -> bar 8");
                return true;

            case 73: // Paste
                this.bitwig._application.paste();
                this.host.showPopupNotification("Paste");
                return true;

            case 74: // Select Everything action
                this.bitwig.invokeAction(this.bitwigActions.SELECT_EVERYTHING);
                this.host.showPopupNotification("Select Everything");
                return true;

            // Pink row (61-68): Building blocks for testing mode actions
            case 61: // Object selection tool
                this.bitwig.invokeAction(this.bitwigActions.TOOL_OBJECT_SELECTION);
                this.host.showPopupNotification("Tool: Object");
                return true;

            case 62: // Time selection tool
                this.bitwig.invokeAction(this.bitwigActions.TOOL_TIME_SELECTION);
                this.host.showPopupNotification("Tool: Time Sel");
                return true;

            case 63: // Toggle between Object and Time Selection modes
                this.bitwig.invokeAction(this.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                this.host.showPopupNotification("Toggle Mode");
                return true;

            case 64: // Event selection tool
                this.bitwig.invokeAction(this.bitwigActions.TOOL_EVENT_SELECTION);
                this.host.showPopupNotification("Tool: Event");
                return true;

            // Green row (51-58): Loop-based time selection workflow
            case 51: // Select None
                this.bitwig._application.selectNone();
                this.host.showPopupNotification("Select None");
                return true;

            case 52: // Set Loop ON
                this.bitwig._transport.setLoop(true);
                this.host.showPopupNotification("Loop: ON");
                return true;

            case 53: // Set Loop OFF
                this.bitwig._transport.setLoop(false);
                this.host.showPopupNotification("Loop: OFF");
                return true;

            case 54: // Toggle Object/Time Selection mode
                this.bitwig.invokeAction(this.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                this.host.showPopupNotification("Toggle Mode");
                return true;

            // Yellow pad (55): Copy loop bounds to time selection
            case 55:
                var transport = this.bitwig._transport;
                var loopStart = transport.arrangerLoopStart().get();
                var loopDuration = transport.arrangerLoopDuration().get();
                var loopEnd = loopStart + loopDuration;
                this.bitwig.setTimeSelection(loopStart, loopEnd);
                this.host.showPopupNotification("TimeSel=Loop " + Math.round(loopStart) + "-" + Math.round(loopEnd));
                return true;

            // Cyan pad (56): Detective - find loop/select related actions
            case 56:
                var actions = this.bitwig._application.getActions();
                this.println("=== Loop/Select related actions ===");
                for (var i = 0; i < actions.length; i++) {
                    var id = actions[i].getId().toLowerCase();
                    var name = actions[i].getName().toLowerCase();
                    if ((id.indexOf("loop") !== -1) ||
                        (id.indexOf("time") !== -1 && id.indexOf("select") !== -1) ||
                        (name.indexOf("loop") !== -1) ||
                        (name.indexOf("time") !== -1 && name.indexOf("select") !== -1)) {
                        this.println(actions[i].getId() + " : " + actions[i].getName());
                    }
                }
                this.println("=== End ===");
                this.host.showPopupNotification("Detective: check console");
                return true;

            // Purple pad (57): Insert Silence test
            case 57:
                this.bitwig.invokeAction(this.bitwigActions.INSERT_SILENCE);
                this.host.showPopupNotification("Insert Silence");
                return true;
        }
        return false;
    }

    handlePadRelease(padNote) {
        return false;
    }
}

var Page_DebugActions = {};
if (typeof module !== 'undefined') module.exports = PageDebugActionsHW;
