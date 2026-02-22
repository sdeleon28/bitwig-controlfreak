/**
 * Launchpad top lane for marker navigation
 */
class LaunchpadLaneHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.bitwigActions - BitwigActions namespace
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.controller - Controller namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig || null;
        this.bitwigActions = deps.bitwigActions || null;
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.controller = deps.controller || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        // Instance state
        this._queuedPad = null;
        this._playingPad = null;

        // Action pads configuration
        this.actionPads = {
            pads: [55, 56, 57, 58],
            indices: [28, 29, 30, 31],
            colors: {
                toggleMode: 53,
                insertSilence: 49,
                copy: 37,
                paste: 21
            }
        };

        // Top lane pad configuration
        this.topLane = {
            pads: [
                81, 82, 83, 84, 85, 86, 87, 88,
                71, 72, 73, 74, 75, 76, 77, 78,
                61, 62, 63, 64, 65, 66, 67, 68,
                51, 52, 53, 54, 55, 56, 57, 58
            ],
            _padToMarkerIndex: null,
            getMarkerIndex: function(padNote) {
                return this._padToMarkerIndex[padNote] !== undefined ? this._padToMarkerIndex[padNote] : null;
            }
        };

        // Initialize pad-to-marker mapping (replaces topLane.init())
        this.topLane._padToMarkerIndex = {};
        for (var i = 0; i < this.topLane.pads.length; i++) {
            this.topLane._padToMarkerIndex[this.topLane.pads[i]] = i;
        }

        if (this.debug) this.println("LaunchpadLane initialized");
    }

    registerMarkerBehaviors() {
        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;
        var self = this;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            if (this.actionPads.indices.indexOf(i) !== -1) continue;

            var padNote = this.topLane.pads[i];
            (function(markerIndex) {
                var clickCallback = function() {
                    var marker = markerBank.getItemAt(markerIndex);
                    if (marker && marker.exists().get()) {
                        marker.launch(true);
                        self.setQueuedPad(markerIndex);
                        if (self.debug) self.println("Jumped to marker " + markerIndex);
                    }
                };
                var holdCallback = function() {
                    self.controller.prepareRecordingAtRegion(markerIndex, markerIndex);
                };
                self.launchpad.registerPadBehavior(padNote, clickCallback, holdCallback, 1);
            })(i);
        }

        if (this.debug) this.println("Marker behaviors registered (excluding action pads)");
    }

    registerActionBehaviors() {
        var self = this;
        var colors = this.actionPads.colors;

        this.launchpad.registerPadBehavior(55, function() {
            self.bitwig.invokeAction(self.bitwigActions.TOGGLE_OBJECT_TIME_SELECTION);
            self.host.showPopupNotification("Toggle Obj/Time Mode");
        }, null, 1);

        this.launchpad.registerPadBehavior(56, function() {
            self.bitwig.invokeAction(self.bitwigActions.INSERT_SILENCE);
            self.host.showPopupNotification("Insert Silence");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.REMOVE_TIME);
            self.host.showPopupNotification("Remove Time");
        }, 1);

        this.launchpad.registerPadBehavior(57, function() {
            self.bitwig._application.copy();
            self.host.showPopupNotification("Copy");
        }, function() {
            self.bitwig.invokeAction(self.bitwigActions.CUT_TIME);
            self.host.showPopupNotification("Cut Time");
        }, 1);

        this.launchpad.registerPadBehavior(58, function() {
            self.bitwig._application.paste();
            self.bitwig.invokeAction(self.bitwigActions.INSERT_CUE_MARKER);
            self.host.showPopupNotification("Paste + Marker");
        }, null, 1);

        if (this.debug) this.println("Action behaviors registered for pads 55-58");
    }

    refresh(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            if (this.actionPads.indices.indexOf(i) === -1) {
                this.pager.requestClear(pageNumber, this.topLane.pads[i]);
            }
        }

        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            if (this.actionPads.indices.indexOf(i) !== -1) continue;

            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                var color = marker.getColor();
                var launchpadColor = this.launchpad.bitwigColorToLaunchpad(
                    color.red(),
                    color.green(),
                    color.blue()
                );
                this.pager.requestPaint(pageNumber, this.topLane.pads[i], launchpadColor);
            }
        }

        this.refreshActionPads(pageNumber);

        if (this.debug) this.println("LaunchpadLane refreshed for page " + pageNumber);
    }

    refreshActionPads(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        var colors = this.actionPads.colors;
        this.pager.requestPaint(pageNumber, 55, colors.toggleMode);
        this.pager.requestPaint(pageNumber, 56, colors.insertSilence);
        this.pager.requestPaint(pageNumber, 57, colors.copy);
        this.pager.requestPaint(pageNumber, 58, colors.paste);
    }

    updatePlayheadIndicator(beat) {
        if (this.pager.getActivePage() !== 1) return;

        var newPadIndex = this.getPadIndexForBeat(beat);
        if (newPadIndex === this._playingPad) return;

        if (this._playingPad !== null) {
            this.repaintPad(this._playingPad, 'static');
        }

        if (newPadIndex === this._queuedPad) {
            this._queuedPad = null;
        }

        this._playingPad = newPadIndex;

        if (newPadIndex !== null) {
            this.repaintPad(newPadIndex, 'flashing');
        }
    }

    setQueuedPad(padIndex) {
        if (this._queuedPad !== null && this._queuedPad !== this._playingPad) {
            this.repaintPad(this._queuedPad, 'static');
        }
        this._queuedPad = padIndex;
        if (padIndex !== null && padIndex !== this._playingPad) {
            this.repaintPad(padIndex, 'pulsing');
        }
    }

    getPadIndexForBeat(beat) {
        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return null;

        var markers = [];
        for (var i = 0; i < this.topLane.pads.length; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                markers.push({ index: i, position: marker.position().get() });
            }
        }
        if (markers.length === 0) return null;

        markers.sort(function(a, b) { return a.position - b.position; });

        for (var i = markers.length - 1; i >= 0; i--) {
            if (beat >= markers[i].position) {
                return markers[i].index;
            }
        }
        return null;
    }

    getColorForPad(padIndex) {
        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return null;
        var marker = markerBank.getItemAt(padIndex);
        if (!marker || !marker.exists().get()) return null;
        var color = marker.getColor();
        return this.launchpad.bitwigColorToLaunchpad(color.red(), color.green(), color.blue());
    }

    repaintPad(padIndex, mode) {
        var color = this.getColorForPad(padIndex);
        if (color === null) return;

        var padNote = this.topLane.pads[padIndex];
        if (mode === 'pulsing') {
            this.pager.requestPaintPulsing(1, padNote, color);
        } else if (mode === 'flashing') {
            this.pager.requestPaintFlashing(1, padNote, color);
        } else {
            this.pager.requestPaint(1, padNote, color);
        }
    }
}

var LaunchpadLane = {};
if (typeof module !== 'undefined') module.exports = LaunchpadLaneHW;
