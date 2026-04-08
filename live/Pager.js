/**
 * Page state manager and hardware gatekeeper.
 *
 * Architectural rule: pages MUST NOT call launchpad.setPadColor* directly.
 * All paint requests go through Pager.requestPaint(...). The Pager only
 * forwards to hardware if the requesting page is the active one. On page
 * switch, the launchpad is atomically cleared and the new page's stored
 * state is repainted.
 */
class PagerHW {
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._pageStates = {};
        this._activePage = 1;
    }

    init(initialPage) {
        this._pageStates = {};
        this._activePage = initialPage || 1;
    }

    requestPaint(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'static');
    }

    requestPaintFlashing(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'flashing');
    }

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

    requestClear(pageNumber, padNumber) {
        this.requestPaint(pageNumber, padNumber, this.launchpad.colors.off);
    }

    requestClearAll(pageNumber) {
        this._pageStates[pageNumber] = {};
        if (pageNumber === this._activePage) {
            this.launchpad.clearAll();
        }
    }

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
                this._paintPadWithMode(pad, state.color, state.mode || 'static');
            }
        }
    }

    getActivePage() {
        return this._activePage;
    }

    isPageActive(pageNumber) {
        return pageNumber === this._activePage;
    }

    getPageState(pageNumber) {
        return this._pageStates[pageNumber] || {};
    }
}

if (typeof module !== 'undefined') module.exports = PagerHW;
