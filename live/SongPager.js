/**
 * SongPager — left/right top buttons walk between songs in the project
 * explorer. Bound to top buttons cc 106 (left) and cc 107 (right).
 *
 * Page-aware: handlers only fire when the project explorer page is active.
 * The button colors are refreshed (purple if available, off if at the
 * boundary) any time the underlying song list might have changed.
 */
class SongPagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {Object} deps.projectExplorer - PageProjectExplorerHW
     * @param {number} deps.pageNumber - the project explorer page number
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
        this.launchpad.registerTopButton(this.launchpad.buttons.left, function() {
            self.previous();
        }, this.pageNumber);
        this.launchpad.registerTopButton(this.launchpad.buttons.right, function() {
            self.next();
        }, this.pageNumber);
    }

    previous() {
        var i = this.projectExplorer.getCurrentSongIndex();
        if (i <= 0) return;
        this.projectExplorer.setSong(i - 1);
        this.refreshButtons();
    }

    next() {
        var i = this.projectExplorer.getCurrentSongIndex();
        if (i >= this.projectExplorer.getSongCount() - 1) return;
        this.projectExplorer.setSong(i + 1);
        this.refreshButtons();
    }

    refreshButtons() {
        if (!this.pager.isPageActive(this.pageNumber)) return;
        var purple = this.launchpad.colors.purple;
        var off = this.launchpad.colors.off;
        var i = this.projectExplorer.getCurrentSongIndex();
        var count = this.projectExplorer.getSongCount();
        this.launchpad.setTopButtonColor(this.launchpad.buttons.left, i > 0 ? purple : off);
        this.launchpad.setTopButtonColor(this.launchpad.buttons.right, i < count - 1 ? purple : off);
    }
}

if (typeof module !== 'undefined') module.exports = SongPagerHW;
