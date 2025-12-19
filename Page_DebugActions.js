/**
 * Page 4: Debug Actions for testing copy workflow
 * Each pad triggers a single action with a growl notification
 * @namespace
 */
var Page_DebugActions = {
    id: "debug-actions",
    pageNumber: 4,

    init: function() {
        if (debug) println("Page_DebugActions initialized on page " + this.pageNumber);
    },

    show: function() {
        this.refresh();
    },

    hide: function() {
        if (debug) println("Hiding debug actions page");
    },

    refresh: function() {
        // Color the action pads amber to show they're active
        var amberPads = [81, 82, 83, 84, 85, 86, 87, 88, 71, 72, 73, 74];
        for (var i = 0; i < amberPads.length; i++) {
            Pager.requestPaint(this.pageNumber, amberPads[i], 5); // amber
        }

        // Color the building blocks row pink for testing mode actions
        var pinkPads = [61, 62, 63, 64];
        for (var i = 0; i < pinkPads.length; i++) {
            Pager.requestPaint(this.pageNumber, pinkPads[i], 53); // pink
        }

        // Color the loop-based time selection row green
        var greenPads = [51, 52, 53, 54];
        for (var i = 0; i < greenPads.length; i++) {
            Pager.requestPaint(this.pageNumber, greenPads[i], 21); // green
        }

        // Yellow pad for loop bounds -> time selection
        Pager.requestPaint(this.pageNumber, 55, 13); // yellow

        // Cyan pad for detective script
        Pager.requestPaint(this.pageNumber, 56, 37); // cyan

        // Purple pad for Insert Silence test
        Pager.requestPaint(this.pageNumber, 57, 49); // purple
    },

    handlePadPress: function(padNote) {
        switch (padNote) {
            // Top row (81-88)
            case 81: // Time selection TARGET (bars 8-12)
                Bitwig.setTimeSelection(32, 48);
                host.showPopupNotification("Time sel: TARGET (bar 8-12)");
                return true;

            case 82: // Toggle Object/Time Selection mode
                Bitwig.invokeAction(BitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                host.showPopupNotification("Toggle Obj/Time Mode");
                return true;

            case 83: // Insert Silence
                Bitwig.invokeAction(BitwigActions.INSERT_SILENCE);
                host.showPopupNotification("Insert Silence");
                return true;

            case 84: // Time selection SOURCE (bars 0-4)
                Bitwig.setTimeSelection(0, 16);
                host.showPopupNotification("Time sel: SOURCE (bar 0-4)");
                return true;

            case 85: // Split
                Bitwig.invokeAction(BitwigActions.SPLIT);
                host.showPopupNotification("Split");
                return true;

            case 86: // Switch to Object mode
                Bitwig.invokeAction(BitwigActions.TOOL_POINTER);
                host.showPopupNotification("Tool: Object Selection");
                return true;

            case 87: // Select All
                Bitwig._application.selectAll();
                host.showPopupNotification("Select All");
                return true;

            case 88: // Loop Selection action
                Bitwig.invokeAction(BitwigActions.LOOP_SELECTION);
                host.showPopupNotification("Loop Selection");
                return true;

            // Second row (71-78)
            case 71: // Copy
                Bitwig._application.copy();
                host.showPopupNotification("Copy");
                return true;

            case 72: // Move playhead to bar 8
                Bitwig.setPlayheadPosition(32);
                host.showPopupNotification("Playhead -> bar 8");
                return true;

            case 73: // Paste
                Bitwig._application.paste();
                host.showPopupNotification("Paste");
                return true;

            case 74: // Select Everything action
                Bitwig.invokeAction(BitwigActions.SELECT_EVERYTHING);
                host.showPopupNotification("Select Everything");
                return true;

            // Pink row (61-68): Building blocks for testing mode actions
            case 61: // Object selection tool
                Bitwig.invokeAction(BitwigActions.TOOL_OBJECT_SELECTION);
                host.showPopupNotification("Tool: Object");
                return true;

            case 62: // Time selection tool
                Bitwig.invokeAction(BitwigActions.TOOL_TIME_SELECTION);
                host.showPopupNotification("Tool: Time Sel");
                return true;

            case 63: // Toggle between Object and Time Selection modes
                Bitwig.invokeAction(BitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                host.showPopupNotification("Toggle Mode");
                return true;

            case 64: // Event selection tool
                Bitwig.invokeAction(BitwigActions.TOOL_EVENT_SELECTION);
                host.showPopupNotification("Tool: Event");
                return true;

            // Green row (51-58): Loop-based time selection workflow
            case 51: // Select None
                Bitwig._application.selectNone();
                host.showPopupNotification("Select None");
                return true;

            case 52: // Set Loop ON
                Bitwig._transport.setLoop(true);
                host.showPopupNotification("Loop: ON");
                return true;

            case 53: // Set Loop OFF
                Bitwig._transport.setLoop(false);
                host.showPopupNotification("Loop: OFF");
                return true;

            case 54: // Toggle Object/Time Selection mode
                Bitwig.invokeAction(BitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
                host.showPopupNotification("Toggle Mode");
                return true;

            // Yellow pad (55): Copy loop bounds to time selection
            case 55:
                var transport = Bitwig._transport;
                var loopStart = transport.arrangerLoopStart().get();
                var loopDuration = transport.arrangerLoopDuration().get();
                var loopEnd = loopStart + loopDuration;
                Bitwig.setTimeSelection(loopStart, loopEnd);
                host.showPopupNotification("TimeSel=Loop " + Math.round(loopStart) + "-" + Math.round(loopEnd));
                return true;

            // Cyan pad (56): Detective - find loop/select related actions
            case 56:
                var actions = Bitwig._application.getActions();
                println("=== Loop/Select related actions ===");
                for (var i = 0; i < actions.length; i++) {
                    var id = actions[i].getId().toLowerCase();
                    var name = actions[i].getName().toLowerCase();
                    if ((id.indexOf("loop") !== -1) ||
                        (id.indexOf("time") !== -1 && id.indexOf("select") !== -1) ||
                        (name.indexOf("loop") !== -1) ||
                        (name.indexOf("time") !== -1 && name.indexOf("select") !== -1)) {
                        println(actions[i].getId() + " : " + actions[i].getName());
                    }
                }
                println("=== End ===");
                host.showPopupNotification("Detective: check console");
                return true;

            // Purple pad (57): Insert Silence test
            case 57:
                Bitwig.invokeAction(BitwigActions.INSERT_SILENCE);
                host.showPopupNotification("Insert Silence");
                return true;
        }
        return false;
    },

    handlePadRelease: function(padNote) {
        return false;
    }
};
