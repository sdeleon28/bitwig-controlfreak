/**
 * Page state manager and hardware gatekeeper
 * Implements reactive "UI is a function of state" architecture
 * - Each page maintains its own state (desired pad colors)
 * - All paint requests go through Pager.requestPaint()
 * - Pager only updates hardware if request is from active page
 * - On page switch, Pager atomically clears and repaints stored state
 */
class PagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad hardware abstraction
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._pageStates = {};
        this._activePage = 1;
    }

    /**
     * Initialize Pager with empty states
     */
    init() {
        this._pageStates = {};
        this._activePage = 1;
        if (this.debug) this.println("Pager initialized - reactive page isolation enabled");
    }

    /**
     * Request a pad paint operation (gatekeeper)
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaint(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'static');
    }

    /**
     * Request painting a pad with flashing effect
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintFlashing(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'flashing');
    }

    /**
     * Request painting a pad with pulsing effect
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintPulsing(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'pulsing');
    }

    _requestPaintWithMode(pageNumber, padNumber, color, mode) {
        if (!this._pageStates[pageNumber]) {
            this._pageStates[pageNumber] = {};
        }

        this._pageStates[pageNumber][padNumber] = { color: color, mode: mode };

        if (pageNumber === this._activePage) {
            this._paintPadWithMode(padNumber, color, mode);
        }
    }

    _paintPadWithMode(padNumber, color, mode) {
        if (mode === 'flashing') {
            this.launchpad.setPadColorFlashing(padNumber, color);
        } else if (mode === 'pulsing') {
            this.launchpad.setPadColorPulsing(padNumber, color);
        } else {
            this.launchpad.setPadColor(padNumber, color);
        }
    }

    /**
     * Request clearing a single pad
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number to clear
     */
    requestClear(pageNumber, padNumber) {
        this.requestPaint(pageNumber, padNumber, this.launchpad.colors.off);
    }

    /**
     * Request clearing all pads for a page
     * @param {number} pageNumber - Which page to clear
     */
    requestClearAll(pageNumber) {
        this._pageStates[pageNumber] = {};

        if (pageNumber === this._activePage) {
            for (var i = 0; i < 128; i++) {
                this.launchpad.clearPad(i);
            }
        }
    }

    /**
     * Switch to a different page
     * Atomically clears hardware and repaints new page's stored state
     * @param {number} pageNumber - Page number to switch to
     */
    switchToPage(pageNumber) {
        if (pageNumber === this._activePage) return;

        var oldPage = this._activePage;
        this._activePage = pageNumber;

        if (this.debug) this.println("Pager: switching from page " + oldPage + " to page " + pageNumber);

        this.launchpad.clearAll();

        var pageState = this._pageStates[pageNumber] || {};
        for (var padNote in pageState) {
            if (pageState.hasOwnProperty(padNote)) {
                var pad = parseInt(padNote);
                var state = pageState[padNote];
                if (typeof state === 'object' && state.color !== undefined) {
                    this._paintPadWithMode(pad, state.color, state.mode || 'static');
                } else {
                    this.launchpad.setPadColor(pad, state);
                }
            }
        }
    }

    /**
     * Get current active page number
     * @returns {number} Active page number
     */
    getActivePage() {
        return this._activePage;
    }

    /**
     * Check if a page is currently active
     * @param {number} pageNumber - Page number to check
     * @returns {boolean} True if page is active
     */
    isPageActive(pageNumber) {
        return pageNumber === this._activePage;
    }

    /**
     * Get stored state for a page
     * @param {number} pageNumber - Page number
     * @returns {Object} State object {padNumber: {color, mode}}
     */
    getPageState(pageNumber) {
        return this._pageStates[pageNumber] || {};
    }
}

var Pager = {};
if (typeof module !== 'undefined') module.exports = PagerHW;
