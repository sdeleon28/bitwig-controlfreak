/**
 * SideButtons — wires the right-edge launchpad side buttons to transport
 * actions and the setlist growl. These are page-aware and only active
 * while the project explorer page is showing (except for volume/pan,
 * which the ModeSwitcher binds globally).
 *
 * Mapping (matches the prototype's SideButton enum labels):
 *   - stop  (note 49) -> Stop transport
 *   - solo  (note 29) -> Toggle arranger loop
 *   - mute  (note 39) -> Toggle metronome
 *   - sendA (note 69) -> Show setlist popup (one song name per line)
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

        this.launchpad.registerSideButton(sb.solo, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_ARRANGER_LOOP);
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.mute, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_METRONOME);
        }, this.pageNumber);

        this.launchpad.registerSideButton(sb.sendA, function() {
            self.showSetlist();
        }, this.pageNumber);

        this.refreshColors();
    }

    showSetlist() {
        if (!this.host) return;
        var songs = this.projectExplorer.getSongs();
        if (!songs || songs.length === 0) {
            this.host.showPopupNotification("(no songs)");
            return;
        }
        var lines = [];
        for (var i = 0; i < songs.length; i++) {
            lines.push((i + 1) + ". " + songs[i].name);
        }
        this.host.showPopupNotification(lines.join("\n"));
    }

    refreshColors() {
        var sb = this.launchpad.sideButtons;
        var c = this.launchpad.colors;
        this.launchpad.setSideButtonColor(sb.stop, c.red);
        this.launchpad.setSideButtonColor(sb.solo, c.cyan);
        this.launchpad.setSideButtonColor(sb.mute, c.amber);
        this.launchpad.setSideButtonColor(sb.sendA, c.purple);
    }
}

if (typeof module !== 'undefined') module.exports = SideButtonsHW;
