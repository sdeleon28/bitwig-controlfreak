/**
 * SideButtons — wires the right-edge launchpad side buttons to transport
 * actions and the setlist growl. These are page-aware and only active
 * while the project explorer page is showing (except for volume/pan,
 * which the ModeSwitcher binds globally).
 *
 * Mapping:
 *   - stop  (note 49) -> Stop transport
 *   - mute  (note 39) -> Toggle arranger loop
 *   - solo  (note 29) -> Toggle metronome
 *   - sendA (note 69) -> Show setlist popup
 *   - recordArm (note 19) -> Toggle time-selection gesture on the
 *     project explorer (click to start, then tap two pads for the loop
 *     range; click again before completion to cancel).
 */
class SideButtonsHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad
     * @param {Object} deps.bitwig
     * @param {Object} deps.bitwigActions
     * @param {Object} deps.projectExplorer - for the setlist
     * @param {Object} deps.host
     * @param {number} deps.pageNumber - the project explorer page number
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad;
        this.bitwig = deps.bitwig;
        this.bitwigActions = deps.bitwigActions;
        this.projectExplorer = deps.projectExplorer;
        this.host = deps.host;
        this.pageNumber = deps.pageNumber;
    }

    init() {
        var self = this;
        var sb = this.launchpad.sideButtons;

        this.launchpad.registerSideButton(sb.stop, function() {
            self.bitwig.invokeAction(self.bitwigActions.STOP);
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.mute, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_ARRANGER_LOOP);
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.solo, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_METRONOME);
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.sendA, function() {
            self.showSetlist();
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.recordArm, function() {
            if (self.projectExplorer && self.projectExplorer.toggleTimeSelect) {
                self.projectExplorer.toggleTimeSelect();
            }
        }, this.pageNumber);

        // React to transport state changes — only when our page is active.
        this.bitwig.onLoopEnabledChanged(function() { self._refreshIfActive(); });
        this.bitwig.onMetronomeEnabledChanged(function() { self._refreshIfActive(); });
        this.bitwig.onIsPlayingChanged(function() { self._refreshIfActive(); });

        this.refreshColors();
    }

    _refreshIfActive() {
        if (this.launchpad.pager && this.launchpad.pager.isPageActive(this.pageNumber)) {
            this.refreshColors();
        }
    }

    showSetlist() {
        if (!this.host) return;
        var songs = this.projectExplorer.getSongs();
        if (!songs || songs.length === 0) {
            this.host.showPopupNotification("(no songs)");
            return;
        }
        // Bitwig's popup notifications collapse newlines, so use a clear
        // visual separator between song names.
        var parts = [];
        for (var i = 0; i < songs.length; i++) {
            parts.push((i + 1) + ". " + songs[i].name);
        }
        this.host.showPopupNotification(parts.join("  ·  "));
    }

    refreshColors() {
        var sb = this.launchpad.sideButtons;
        var c = this.launchpad.colors;

        // Stop: solid red when stopped, flashing red while transport is playing.
        if (this.bitwig.isPlaying()) {
            this.launchpad.setSideButtonColorFlashing(sb.stop, c.red);
        } else {
            this.launchpad.setSideButtonColor(sb.stop, c.red);
        }

        // Mute → loop: cyan when arranger loop is enabled, off when not.
        this.launchpad.setSideButtonColor(sb.mute,
            this.bitwig.isLoopEnabled() ? c.cyan : c.off);

        // Solo → metronome: yellow when metronome is on, off when not.
        this.launchpad.setSideButtonColor(sb.solo,
            this.bitwig.isMetronomeEnabled() ? c.yellow : c.off);

        // SendA → setlist popup: always lit purple.
        this.launchpad.setSideButtonColor(sb.sendA, c.purple);

        // RecordArm → time-select gesture: flashing red while waiting for
        // the user's two pad clicks; off otherwise.
        var gestureActive = this.projectExplorer
            && this.projectExplorer.isTimeSelectActive
            && this.projectExplorer.isTimeSelectActive();
        if (gestureActive) {
            this.launchpad.setSideButtonColorFlashing(sb.recordArm, c.red);
        } else {
            this.launchpad.setSideButtonColor(sb.recordArm, c.off);
        }
    }

    clearColors() {
        var sb = this.launchpad.sideButtons;
        var off = this.launchpad.colors.off;
        this.launchpad.setSideButtonColor(sb.stop, off);
        this.launchpad.setSideButtonColor(sb.mute, off);
        this.launchpad.setSideButtonColor(sb.solo, off);
        this.launchpad.setSideButtonColor(sb.sendA, off);
        this.launchpad.setSideButtonColor(sb.recordArm, off);
    }
}

if (typeof module !== 'undefined') module.exports = SideButtonsHW;
