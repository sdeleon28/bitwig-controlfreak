/**
 * SongPager — left/right top buttons walk between songs in the project
 * explorer. Bound to top buttons cc 106 (left) and cc 107 (right).
 *
 * Page-aware: handlers only fire when the project explorer page is active.
 * The button colors are refreshed (purple if available, off if at the
 * boundary) any time the underlying song list might have changed.
 *
 * Disabled during playback: pressing prev/next while the transport is
 * running causes the auto-follow logic on the explorer to fight the
 * manual song switch and leaves the page in a confused state. While
 * playing, both buttons are dark and click handlers no-op.
 */
class SongPagerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {Object} deps.projectExplorer - PageProjectExplorerHW
     * @param {Object} deps.bitwig - used to gate prev/next on play state
     * @param {Object} [deps.host] - for showPopupNotification on switch
     * @param {number} deps.pageNumber - the project explorer page number
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.projectExplorer = deps.projectExplorer;
        this.bitwig = deps.bitwig || null;
        this.host = deps.host || null;
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
        // Recolor when transport play state changes so the buttons reflect
        // their disabled state immediately.
        if (this.bitwig && this.bitwig.onIsPlayingChanged) {
            this.bitwig.onIsPlayingChanged(function() { self.refreshButtons(); });
        }
    }

    _isPlaying() {
        return !!(this.bitwig && this.bitwig.isPlaying && this.bitwig.isPlaying());
    }

    previous() {
        if (this._isPlaying()) return;
        var i = this.projectExplorer.getCurrentSongIndex();
        if (i <= 0) return;
        this.projectExplorer.setSong(i - 1);
        this._growlCurrentSong();
        this.refreshButtons();
    }

    next() {
        if (this._isPlaying()) return;
        var i = this.projectExplorer.getCurrentSongIndex();
        if (i >= this.projectExplorer.getSongCount() - 1) return;
        this.projectExplorer.setSong(i + 1);
        this._growlCurrentSong();
        this.refreshButtons();
    }

    _growlCurrentSong() {
        if (!this.host || !this.projectExplorer.getSongs) return;
        var songs = this.projectExplorer.getSongs();
        var i = this.projectExplorer.getCurrentSongIndex();
        if (i < 0 || i >= songs.length) return;
        var song = songs[i];
        var name = (song && song.name) ? song.name : "(unnamed)";
        this.host.showPopupNotification(name);
    }

    refreshButtons() {
        if (!this.pager.isPageActive(this.pageNumber)) return;
        var purple = this.launchpad.colors.purple;
        var off = this.launchpad.colors.off;
        var i = this.projectExplorer.getCurrentSongIndex();
        var count = this.projectExplorer.getSongCount();
        var disabled = this._isPlaying();
        this.launchpad.setTopButtonColor(this.launchpad.buttons.left,
            (!disabled && i > 0) ? purple : off);
        this.launchpad.setTopButtonColor(this.launchpad.buttons.right,
            (!disabled && i < count - 1) ? purple : off);
    }
}

if (typeof module !== 'undefined') module.exports = SongPagerHW;
