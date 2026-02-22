/**
 * Color Palette viewer page
 * Shows Launchpad colors across the 8x8 grid
 * Instantiate twice with different offsets to cover all 128 colors
 */
class PageColorPaletteHW {
    /**
     * @param {Object} deps
     * @param {string} deps.id - Page identifier
     * @param {number} deps.pageNumber - Page number in the pager system
     * @param {number} deps.colorOffset - Starting color index (0 or 64)
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.host - Bitwig host object
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.id = deps.id || "color-palette";
        this.pageNumber = deps.pageNumber || 5;
        this.colorOffset = deps.colorOffset || 0;
        this.pager = deps.pager || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.padNotes = PageColorPaletteHW.PAD_NOTES;
    }

    init() {
        if (this.debug) this.println("PageColorPalette (" + this.id + ") initialized on page " + this.pageNumber);
    }

    show() {
        this.refresh();
    }

    hide() {
        if (this.debug) this.println("Hiding color palette " + this.id);
    }

    refresh() {
        for (var i = 0; i < this.padNotes.length; i++) {
            var colorValue = this.colorOffset + i;
            if (this.pager) {
                this.pager.requestPaint(this.pageNumber, this.padNotes[i], colorValue);
            }
        }
    }

    handlePadPress(padNote) {
        var padIndex = this.padNotes.indexOf(padNote);
        if (padIndex === -1) return false;

        var colorValue = this.colorOffset + padIndex;
        var row = Math.floor(padIndex / 8) + 1;
        var col = (padIndex % 8) + 1;

        this.println("=== Color Info ===");
        this.println("  Color value: " + colorValue);
        this.println("  Hex: 0x" + colorValue.toString(16).toUpperCase().padStart(2, '0'));
        this.println("  Pad note: " + padNote);
        this.println("  Grid position: row " + row + ", col " + col);
        this.println("==================");

        if (this.host) {
            this.host.showPopupNotification("Color: " + colorValue + " (0x" + colorValue.toString(16).toUpperCase() + ")");
        }
        return true;
    }

    handlePadRelease(padNote) {
        return false;
    }
}

PageColorPaletteHW.PAD_NOTES = [
    11, 12, 13, 14, 15, 16, 17, 18,  // Row 1 (bottom)
    21, 22, 23, 24, 25, 26, 27, 28,  // Row 2
    31, 32, 33, 34, 35, 36, 37, 38,  // Row 3
    41, 42, 43, 44, 45, 46, 47, 48,  // Row 4
    51, 52, 53, 54, 55, 56, 57, 58,  // Row 5
    61, 62, 63, 64, 65, 66, 67, 68,  // Row 6
    71, 72, 73, 74, 75, 76, 77, 78,  // Row 7
    81, 82, 83, 84, 85, 86, 87, 88   // Row 8 (top)
];

var Page_ColorPalette = {};
var Page_ColorPalette2 = {};
if (typeof module !== 'undefined') module.exports = PageColorPaletteHW;
