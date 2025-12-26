/**
 * Page management system
 * @namespace
 */
var Pages = {
    /**
     * Registered pages (array of page objects)
     * @private
     */
    _pages: [],

    /**
     * Current page number
     * @private
     */
    _currentPageNumber: 1,

    /**
     * Total pages available
     * @private
     */
    _totalPages: 2,

    /**
     * Initialize pagination system
     */
    init: function() {
        this._currentPageNumber = 1;

        // Initialize all registered pages
        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].init) {
                this._pages[i].init();
            }
        }

        this.refreshPageButtons();
        this.showCurrentPage();

        if (debug) println("Pages initialized - " + this._pages.length + " pages registered");
    },

    /**
     * Register a page
     * @param {Object} pageObj - Page object implementing page interface
     */
    registerPage: function(pageObj) {
        this._pages.push(pageObj);

        // Update total pages based on highest page number
        if (pageObj.pageNumber > this._totalPages) {
            this._totalPages = pageObj.pageNumber;
        }

        if (debug) println("Registered page: " + pageObj.id + " (page " + pageObj.pageNumber + ")");
    },

    /**
     * Get page object by page number
     * @param {number} pageNum - Page number
     * @returns {Object|null} Page object or null
     */
    getPageByNumber: function(pageNum) {
        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].pageNumber === pageNum) {
                return this._pages[i];
            }
        }
        return null;
    },

    /**
     * Get current page object
     * @returns {Object|null} Current page object
     */
    getCurrentPage: function() {
        return this.getPageByNumber(this._currentPageNumber);
    },

    /**
     * Switch to page by number
     * @param {number} pageNum - Target page number
     */
    switchToPage: function(pageNum) {
        if (pageNum < 1 || pageNum > this._totalPages) return;
        if (pageNum === this._currentPageNumber) return;

        // Reset any active ProjectExplorer time select gesture on main page switch
        if (ProjectExplorer._timeSelectActive) {
            ProjectExplorer.resetTimeSelectGesture();
            var color = ProjectExplorer._highlightSelectionEnabled ?
                Launchpad.colors.white : Launchpad.colors.red;
            Launchpad.setPadColor(ProjectExplorer.modifiers.timeSelect, color);
        }

        var oldPage = this.getCurrentPage();
        var newPage = this.getPageByNumber(pageNum);

        if (!newPage) {
            if (debug) println("Warning: No page registered for page " + pageNum);
            return;
        }

        if (debug) println("Switching from page " + this._currentPageNumber + " to page " + pageNum);

        // Notify old page it's hiding (but don't clear - Pager handles that)
        if (oldPage && oldPage.hide) {
            oldPage.hide();
        }

        this._currentPageNumber = pageNum;

        // Let Pager handle hardware clear + repaint
        Pager.switchToPage(pageNum);

        // Clear old page behaviors before showing new page
        Launchpad.clearAllPadBehaviors();

        // Notify new page to update its state (will register its behaviors)
        this.showCurrentPage();
        this.refreshPageButtons();
    },

    /**
     * Show current page
     */
    showCurrentPage: function() {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.show) {
            currentPage.show();
        }
    },

    /**
     * Navigate to next page
     */
    nextPage: function() {
        if (this._currentPageNumber < this._totalPages) {
            this.switchToPage(this._currentPageNumber + 1);
        }
    },

    /**
     * Navigate to previous page
     */
    previousPage: function() {
        if (this._currentPageNumber > 1) {
            this.switchToPage(this._currentPageNumber - 1);
        }
    },

    /**
     * Update page navigation button colors
     */
    refreshPageButtons: function() {
        // Previous page button (CC 104)
        if (this._currentPageNumber > 1) {
            Launchpad.setTopButtonColor(104, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(104, 0);
        }

        // Next page button (CC 105)
        if (this._currentPageNumber < this._totalPages) {
            Launchpad.setTopButtonColor(105, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(105, 0);
        }
    },

    /**
     * Delegate pad press to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadPress: function(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadPress) {
            return currentPage.handlePadPress(padNote);
        }
        return false;
    },

    /**
     * Delegate pad release to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadRelease: function(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadRelease) {
            return currentPage.handlePadRelease(padNote);
        }
        return false;
    }
};
