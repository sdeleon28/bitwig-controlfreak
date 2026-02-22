/**
 * Page management system
 */
class PagesHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.launchpad - Launchpad hardware abstraction
     * @param {Object} deps.projectExplorer - ProjectExplorer namespace (nullable)
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.pager = deps.pager || null;
        this.launchpad = deps.launchpad || null;
        this.projectExplorer = deps.projectExplorer || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._pages = [];
        this._currentPageNumber = 1;
        this._totalPages = 2;
    }

    /**
     * Initialize pagination system
     */
    init() {
        this._currentPageNumber = 1;

        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].init) {
                this._pages[i].init();
            }
        }

        this.refreshPageButtons();
        this.showCurrentPage();

        if (this.debug) this.println("Pages initialized - " + this._pages.length + " pages registered");
    }

    /**
     * Register a page
     * @param {Object} pageObj - Page object implementing page interface
     */
    registerPage(pageObj) {
        this._pages.push(pageObj);

        if (pageObj.pageNumber > this._totalPages) {
            this._totalPages = pageObj.pageNumber;
        }

        if (this.debug) this.println("Registered page: " + pageObj.id + " (page " + pageObj.pageNumber + ")");
    }

    /**
     * Get page object by page number
     * @param {number} pageNum - Page number
     * @returns {Object|null} Page object or null
     */
    getPageByNumber(pageNum) {
        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].pageNumber === pageNum) {
                return this._pages[i];
            }
        }
        return null;
    }

    /**
     * Get current page object
     * @returns {Object|null} Current page object
     */
    getCurrentPage() {
        return this.getPageByNumber(this._currentPageNumber);
    }

    /**
     * Switch to page by number
     * @param {number} pageNum - Target page number
     */
    switchToPage(pageNum) {
        if (pageNum < 1 || pageNum > this._totalPages) return;
        if (pageNum === this._currentPageNumber) return;

        // Reset any active ProjectExplorer time select gesture on main page switch
        if (this.projectExplorer && this.projectExplorer._timeSelectActive) {
            this.projectExplorer.resetTimeSelectGesture();
            this.launchpad.setPadColor(this.projectExplorer.modifiers.timeSelect, this.launchpad.colors.red);
        }

        var oldPage = this.getCurrentPage();
        var newPage = this.getPageByNumber(pageNum);

        if (!newPage) {
            if (this.debug) this.println("Warning: No page registered for page " + pageNum);
            return;
        }

        if (this.debug) this.println("Switching from page " + this._currentPageNumber + " to page " + pageNum);

        if (oldPage && oldPage.hide) {
            oldPage.hide();
        }

        this._currentPageNumber = pageNum;

        this.pager.switchToPage(pageNum);

        this.launchpad.clearAllPadBehaviors();

        this.showCurrentPage();
        this.refreshPageButtons();
    }

    /**
     * Show current page
     */
    showCurrentPage() {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.show) {
            currentPage.show();
        }
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        if (this._currentPageNumber < this._totalPages) {
            this.switchToPage(this._currentPageNumber + 1);
        }
    }

    /**
     * Navigate to previous page
     */
    previousPage() {
        if (this._currentPageNumber > 1) {
            this.switchToPage(this._currentPageNumber - 1);
        }
    }

    /**
     * Update page navigation button colors
     */
    refreshPageButtons() {
        if (this._currentPageNumber > 1) {
            this.launchpad.setTopButtonColor(104, this.launchpad.colors.purple);
        } else {
            this.launchpad.setTopButtonColor(104, 0);
        }

        if (this._currentPageNumber < this._totalPages) {
            this.launchpad.setTopButtonColor(105, this.launchpad.colors.purple);
        } else {
            this.launchpad.setTopButtonColor(105, 0);
        }
    }

    /**
     * Delegate pad press to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadPress(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadPress) {
            return currentPage.handlePadPress(padNote);
        }
        return false;
    }

    /**
     * Delegate pad release to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadRelease(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadRelease) {
            return currentPage.handlePadRelease(padNote);
        }
        return false;
    }
}

var Pages = {};
if (typeof module !== 'undefined') module.exports = PagesHW;
