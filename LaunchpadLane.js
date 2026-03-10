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

        // Top lane pad configuration (rows 6-8 only, 24 markers)
        this.topLane = {
            pads: [
                81, 82, 83, 84, 85, 86, 87, 88,
                71, 72, 73, 74, 75, 76, 77, 78,
                61, 62, 63, 64, 65, 66, 67, 68
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

        if (this.debug) this.println("Marker behaviors registered");
    }

    refresh(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            this.pager.requestClear(pageNumber, this.topLane.pads[i]);
        }

        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < this.topLane.pads.length; i++) {
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

        if (this.debug) this.println("LaunchpadLane refreshed for page " + pageNumber);
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
