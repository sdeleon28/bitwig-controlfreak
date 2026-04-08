/**
 * BarPager — top buttons cc 110 (prev) / cc 111 (next) page through bars
 * within a song that doesn't fit on a single 64-pad launchpad page.
 *
 * Page-aware: handlers only fire when the project explorer page is active.
 */
class BarPagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {Object} deps.projectExplorer
     * @param {number} deps.pageNumber
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.projectExplorer = deps.projectExplorer;
        this.pageNumber = deps.pageNumber;
    }

    init() {
        var self = this;
        this.launchpad.registerTopButton(this.launchpad.buttons.barPagePrev, function() {
            self.previous();
        }, this.pageNumber);
        this.launchpad.registerTopButton(this.launchpad.buttons.barPageNext, function() {
            self.next();
        }, this.pageNumber);
    }

    previous() {
        this.projectExplorer.barPagePrev();
        this.refreshButtons();
    }

    next() {
        this.projectExplorer.barPageNext();
        this.refreshButtons();
    }

    refreshButtons() {
        if (!this.pager.isPageActive(this.pageNumber)) return;
        var purple = this.launchpad.colors.purple;
        var off = this.launchpad.colors.off;
        var page = this.projectExplorer.getCurrentBarPage();
        var total = this.projectExplorer.getTotalBarPages();
        this.launchpad.setTopButtonColor(this.launchpad.buttons.barPagePrev, page > 0 ? purple : off);
        this.launchpad.setTopButtonColor(this.launchpad.buttons.barPageNext, page < total - 1 ? purple : off);
    }
}

if (typeof module !== 'undefined') module.exports = BarPagerHW;
