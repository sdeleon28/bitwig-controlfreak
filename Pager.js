/**
 * Page state manager and hardware gatekeeper
 * Implements reactive "UI is a function of state" architecture
 * - Each page maintains its own state (desired pad colors)
 * - All paint requests go through Pager.requestPaint()
 * - Pager only updates hardware if request is from active page
 * - On page switch, Pager atomically clears and repaints stored state
 * @namespace
 */
var Pager = {
    /**
     * Per-page state storage
     * Structure: { pageNumber: { padNumber: colorValue, ... }, ... }
     */
    _pageStates: {},

    /**
     * Currently active page number
     */
    _activePage: 1,

    /**
     * Initialize Pager with empty states
     */
    init: function() {
        this._pageStates = {};
        this._activePage = 1;
        if (debug) println("Pager initialized - reactive page isolation enabled");
    },

    /**
     * Request a pad paint operation (gatekeeper)
     * Updates page state storage and paints to hardware only if page is active
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaint: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'static');
    },

    /**
     * Request painting a pad with flashing effect (hardware-accelerated)
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintFlashing: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'flashing');
    },

    /**
     * Request painting a pad with pulsing effect (hardware-accelerated)
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintPulsing: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'pulsing');
    },

    /**
     * Internal: Paint pad with specified LED mode
     */
    _requestPaintWithMode: function(pageNumber, padNumber, color, mode) {
        // Initialize page state if needed
        if (!this._pageStates[pageNumber]) {
            this._pageStates[pageNumber] = {};
        }

        // Always update state storage (store both color and mode)
        this._pageStates[pageNumber][padNumber] = { color: color, mode: mode };

        // Only paint to hardware if this page is active
        if (pageNumber === this._activePage) {
            this._paintPadWithMode(padNumber, color, mode);
        }
    },

    /**
     * Internal: Paint to hardware with correct LED mode
     */
    _paintPadWithMode: function(padNumber, color, mode) {
        if (mode === 'flashing') {
            Launchpad.setPadColorFlashing(padNumber, color);
        } else if (mode === 'pulsing') {
            Launchpad.setPadColorPulsing(padNumber, color);
        } else {
            Launchpad.setPadColor(padNumber, color);
        }
    },

    /**
     * Request clearing a single pad
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number to clear
     */
    requestClear: function(pageNumber, padNumber) {
        this.requestPaint(pageNumber, padNumber, Launchpad.colors.off);
    },

    /**
     * Request clearing all pads for a page
     * @param {number} pageNumber - Which page to clear
     */
    requestClearAll: function(pageNumber) {
        // Clear state storage
        this._pageStates[pageNumber] = {};

        // If this page is active, clear hardware too
        if (pageNumber === this._activePage) {
            for (var i = 0; i < 128; i++) {
                Launchpad.clearPad(i);
            }
        }
    },

    /**
     * Switch to a different page
     * Atomically clears hardware and repaints new page's stored state
     * @param {number} pageNumber - Page number to switch to
     */
    switchToPage: function(pageNumber) {
        if (pageNumber === this._activePage) return;

        var oldPage = this._activePage;
        this._activePage = pageNumber;

        if (debug) println("Pager: switching from page " + oldPage + " to page " + pageNumber);

        // Clear all hardware
        Launchpad.clearAll();

        // Repaint new page's stored state
        var pageState = this._pageStates[pageNumber] || {};
        for (var padNote in pageState) {
            if (pageState.hasOwnProperty(padNote)) {
                var pad = parseInt(padNote);
                var state = pageState[padNote];
                // Handle both old format (just color) and new format ({color, mode})
                if (typeof state === 'object' && state.color !== undefined) {
                    this._paintPadWithMode(pad, state.color, state.mode || 'static');
                } else {
                    Launchpad.setPadColor(pad, state);  // Legacy: just color value
                }
            }
        }
    },

    /**
     * Get current active page number
     * @returns {number} Active page number
     */
    getActivePage: function() {
        return this._activePage;
    },

    /**
     * Check if a page is currently active
     * @param {number} pageNumber - Page number to check
     * @returns {boolean} True if page is active
     */
    isPageActive: function(pageNumber) {
        return pageNumber === this._activePage;
    },

    /**
     * Get stored state for a page (for debugging)
     * @param {number} pageNumber - Page number
     * @returns {Object} State object {padNumber: color}
     */
    getPageState: function(pageNumber) {
        return this._pageStates[pageNumber] || {};
    }
};
