/**
 * MainPager — owns which page (control or project explorer) is active
 * and is the only thing allowed to call pager.switchToPage(...).
 *
 * Switching is bound to top buttons "up" (cc 104) and "down" (cc 105):
 *   - up   -> previous page in the registered list
 *   - down -> next page in the registered list
 *
 * Pages are registered in order; index 0 = first page. The first page
 * is the active page on init().
 */
class MainPagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {Array<{pageNumber:number, paint:Function}>} deps.pages
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.pages = deps.pages || [];
        this._index = 0;
    }

    init() {
        var self = this;
        this.pager.init(this.currentPageNumber());

        // Up/down switch pages no matter which page is active
        this.launchpad.registerTopButton(this.launchpad.buttons.up, function() {
            self.previous();
        }, null);
        this.launchpad.registerTopButton(this.launchpad.buttons.down, function() {
            self.next();
        }, null);

        // Show the initial page (paints the grid AND any nav/side button state)
        this._showCurrent();
        this._refreshNavButtons();
    }

    currentPageNumber() {
        return this.pages[this._index].pageNumber;
    }

    currentPage() {
        return this.pages[this._index];
    }

    previous() {
        if (this._index <= 0) return;
        this._index--;
        this._switch();
    }

    next() {
        if (this._index >= this.pages.length - 1) return;
        this._index++;
        this._switch();
    }

    _switch() {
        this.pager.switchToPage(this.currentPageNumber());
        this._showCurrent();
        this._refreshNavButtons();
    }

    /**
     * Tell the current page to show itself. Pages can implement show() to
     * refresh both the grid AND off-grid UI (top buttons, side buttons).
     * Falls back to paint() for pages that only own the grid.
     */
    _showCurrent() {
        var page = this.currentPage();
        if (!page) return;
        if (typeof page.show === 'function') {
            page.show();
        } else if (typeof page.paint === 'function') {
            page.paint();
        }
    }

    // Backwards compat — kept for tests that previously called repaintCurrent
    repaintCurrent() {
        this._showCurrent();
    }

    _refreshNavButtons() {
        var purple = this.launchpad.colors.purple;
        var off = this.launchpad.colors.off;
        this.launchpad.setTopButtonColor(this.launchpad.buttons.up,
            this._index > 0 ? purple : off);
        this.launchpad.setTopButtonColor(this.launchpad.buttons.down,
            this._index < this.pages.length - 1 ? purple : off);
    }
}

if (typeof module !== 'undefined') module.exports = MainPagerHW;
