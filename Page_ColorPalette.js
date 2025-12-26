/**
 * Page 5 & 6: Color Palette viewer
 * Shows all 128 Launchpad colors across two pages
 * Click a pad to log the color value to console
 * @namespace
 */
var Page_ColorPalette = {
    id: "color-palette-1",
    pageNumber: 5,

    // Pad layout (bottom-left to top-right, reading order)
    padNotes: [
        11, 12, 13, 14, 15, 16, 17, 18,  // Row 1 (bottom)
        21, 22, 23, 24, 25, 26, 27, 28,  // Row 2
        31, 32, 33, 34, 35, 36, 37, 38,  // Row 3
        41, 42, 43, 44, 45, 46, 47, 48,  // Row 4
        51, 52, 53, 54, 55, 56, 57, 58,  // Row 5
        61, 62, 63, 64, 65, 66, 67, 68,  // Row 6
        71, 72, 73, 74, 75, 76, 77, 78,  // Row 7
        81, 82, 83, 84, 85, 86, 87, 88   // Row 8 (top)
    ],

    colorOffset: 0,  // Colors 0-63

    init: function() {
        if (debug) println("Page_ColorPalette (page 1) initialized on page " + this.pageNumber);
    },

    show: function() {
        this.refresh();
    },

    hide: function() {
        if (debug) println("Hiding color palette page 1");
    },

    refresh: function() {
        for (var i = 0; i < this.padNotes.length; i++) {
            var colorValue = this.colorOffset + i;
            Pager.requestPaint(this.pageNumber, this.padNotes[i], colorValue);
        }
    },

    handlePadPress: function(padNote) {
        var padIndex = this.padNotes.indexOf(padNote);
        if (padIndex === -1) return false;

        var colorValue = this.colorOffset + padIndex;
        var row = Math.floor(padIndex / 8) + 1;
        var col = (padIndex % 8) + 1;

        println("=== Color Info ===");
        println("  Color value: " + colorValue);
        println("  Hex: 0x" + colorValue.toString(16).toUpperCase().padStart(2, '0'));
        println("  Pad note: " + padNote);
        println("  Grid position: row " + row + ", col " + col);
        println("==================");

        host.showPopupNotification("Color: " + colorValue + " (0x" + colorValue.toString(16).toUpperCase() + ")");
        return true;
    },

    handlePadRelease: function(padNote) {
        return false;
    }
};

/**
 * Page 6: Color Palette viewer (page 2)
 * Shows colors 64-127
 * @namespace
 */
var Page_ColorPalette2 = {
    id: "color-palette-2",
    pageNumber: 6,

    // Same pad layout as page 1
    padNotes: Page_ColorPalette.padNotes,

    colorOffset: 64,  // Colors 64-127

    init: function() {
        if (debug) println("Page_ColorPalette2 (page 2) initialized on page " + this.pageNumber);
    },

    show: function() {
        this.refresh();
    },

    hide: function() {
        if (debug) println("Hiding color palette page 2");
    },

    refresh: function() {
        for (var i = 0; i < this.padNotes.length; i++) {
            var colorValue = this.colorOffset + i;
            Pager.requestPaint(this.pageNumber, this.padNotes[i], colorValue);
        }
    },

    handlePadPress: function(padNote) {
        var padIndex = this.padNotes.indexOf(padNote);
        if (padIndex === -1) return false;

        var colorValue = this.colorOffset + padIndex;
        var row = Math.floor(padIndex / 8) + 1;
        var col = (padIndex % 8) + 1;

        println("=== Color Info ===");
        println("  Color value: " + colorValue);
        println("  Hex: 0x" + colorValue.toString(16).toUpperCase().padStart(2, '0'));
        println("  Pad note: " + padNote);
        println("  Grid position: row " + row + ", col " + col);
        println("==================");

        host.showPopupNotification("Color: " + colorValue + " (0x" + colorValue.toString(16).toUpperCase() + ")");
        return true;
    },

    handlePadRelease: function(padNote) {
        return false;
    }
};
