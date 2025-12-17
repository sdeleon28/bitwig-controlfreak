/**
 * Launchpad top lane for marker navigation
 * @namespace
 */
var LaunchpadLane = {
    /**
     * Pad that's queued to play (pulsing)
     * @private
     */
    _queuedPad: null,

    /**
     * Pad where playhead currently is (flashing)
     * @private
     */
    _playingPad: null,

    /**
     * Top lane pad configuration (top four rows, 8x4 = 32 pads)
     */
    topLane: {
        /**
         * Pad note numbers for top four rows
         */
        pads: [
            81, 82, 83, 84, 85, 86, 87, 88,  // Row 7 (top): markers 0-7
            71, 72, 73, 74, 75, 76, 77, 78,  // Row 6: markers 8-15
            61, 62, 63, 64, 65, 66, 67, 68,  // Row 5: markers 16-23
            51, 52, 53, 54, 55, 56, 57, 58   // Row 4: markers 24-31
        ],

        /**
         * Map pad note number → marker index (0-31)
         * @private
         */
        _padToMarkerIndex: null,

        /**
         * Initialize the top lane
         */
        init: function() {
            // Build pad to marker index mapping
            this._padToMarkerIndex = {};
            for (var i = 0; i < this.pads.length; i++) {
                this._padToMarkerIndex[this.pads[i]] = i;
            }
        },

        /**
         * Get marker index for a pad
         * @param {number} padNote - MIDI note number
         * @returns {number|null} Marker index (0-31) or null
         */
        getMarkerIndex: function(padNote) {
            return this._padToMarkerIndex[padNote] !== undefined ? this._padToMarkerIndex[padNote] : null;
        }
    },

    /**
     * Initialize the lane
     */
    init: function() {
        this.topLane.init();
        // Note: Page 1 uses registerBirdEyeBehaviors(), Page 2 uses ProjectExplorer.registerBehaviors()
        if (debug) println("LaunchpadLane initialized");
    },

    /**
     * Generate color regions from consecutive same-color markers (bird's eye view)
     * @returns {Array} Array of region objects with startIndex, endIndex, color
     */
    generateColorRegions: function() {
        var regions = [];
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return regions;

        var currentRegion = null;
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);
            if (!marker || !marker.exists().get()) continue;

            var color = marker.getColor();
            var launchpadColor = Launchpad.bitwigColorToLaunchpad(
                color.red(), color.green(), color.blue()
            );

            if (currentRegion && currentRegion.color === launchpadColor) {
                // Extend current region
                currentRegion.endIndex = i;
            } else {
                // Start new region
                if (currentRegion) regions.push(currentRegion);
                currentRegion = {
                    startIndex: i,
                    endIndex: i,
                    color: launchpadColor
                };
            }
        }
        if (currentRegion) regions.push(currentRegion);
        return regions;
    },

    /**
     * Register bird's eye view behaviors for page 1 (regions instead of individual markers)
     */
    registerBirdEyeBehaviors: function() {
        var regions = this.generateColorRegions();
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < regions.length && i < this.topLane.pads.length; i++) {
            var padNote = this.topLane.pads[i];
            (function(region) {
                var clickCallback = function() {
                    var marker = markerBank.getItemAt(region.startIndex);
                    if (marker && marker.exists().get()) {
                        marker.launch(true);
                        if (debug) println("Jumped to region starting at marker " + region.startIndex);
                    }
                };
                var holdCallback = function() {
                    Controller.prepareRecordingAtRegion(region.startIndex, region.endIndex);
                };
                Launchpad.registerPadBehavior(padNote, clickCallback, holdCallback, 1);
            })(regions[i]);
        }

        if (debug) println("Bird's eye behaviors registered with " + regions.length + " regions");
    },

    /**
     * Register simple marker behaviors for page 1 (one pad per marker)
     */
    registerMarkerBehaviors: function() {
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            var padNote = this.topLane.pads[i];
            (function(markerIndex) {
                var clickCallback = function() {
                    var marker = markerBank.getItemAt(markerIndex);
                    if (marker && marker.exists().get()) {
                        marker.launch(true);
                        LaunchpadLane.setQueuedPad(markerIndex);
                        if (debug) println("Jumped to marker " + markerIndex);
                    }
                };
                Launchpad.registerPadBehavior(padNote, clickCallback, null, 1);
            })(i);
        }

        if (debug) println("Marker behaviors registered for " + this.topLane.pads.length + " pads");
    },

    /**
     * Refresh bird's eye view for page 1 (displays regions instead of individual markers)
     */
    refreshBirdEye: function() {
        // Clear all pads
        for (var i = 0; i < this.topLane.pads.length; i++) {
            Pager.requestClear(1, this.topLane.pads[i]);
        }

        var regions = this.generateColorRegions();
        for (var i = 0; i < regions.length && i < this.topLane.pads.length; i++) {
            Pager.requestPaint(1, this.topLane.pads[i], regions[i].color);
        }

        if (debug) println("Bird's eye refreshed with " + regions.length + " regions");
    },

    /**
     * Refresh all marker pads based on current marker bank state
     * @param {number} pageNumber - Page number to paint to (default 1)
     */
    refresh: function(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;

        // Clear all top lane pads
        for (var i = 0; i < this.topLane.pads.length; i++) {
            Pager.requestClear(pageNumber, this.topLane.pads[i]);
        }

        // Update pads for each marker
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                // Get marker color using getColor() method
                var color = marker.getColor();
                var launchpadColor = Launchpad.bitwigColorToLaunchpad(
                    color.red(),
                    color.green(),
                    color.blue()
                );
                Pager.requestPaint(pageNumber, this.topLane.pads[i], launchpadColor);
            }
        }

        if (debug) println("LaunchpadLane refreshed for page " + pageNumber);
    },

    /**
     * Update playhead indicator (called by playPosition observer)
     * @param {number} beat - Current playhead position in beats
     */
    updatePlayheadIndicator: function(beat) {
        if (Pager.getActivePage() !== 1) return;

        var newPadIndex = this.getPadIndexForBeat(beat);
        if (newPadIndex === this._playingPad) return;

        // Restore previous playing pad to static
        if (this._playingPad !== null) {
            this.repaintPad(this._playingPad, 'static');
        }

        // Clear queued if playhead arrived
        if (newPadIndex === this._queuedPad) {
            this._queuedPad = null;
        }

        this._playingPad = newPadIndex;

        // Paint new playing pad as flashing
        if (newPadIndex !== null) {
            this.repaintPad(newPadIndex, 'flashing');
        }
    },

    /**
     * Set a pad as queued (pulsing until playhead arrives)
     * @param {number} padIndex - Pad index (0-31)
     */
    setQueuedPad: function(padIndex) {
        // Clear previous queued pad (restore to static)
        if (this._queuedPad !== null && this._queuedPad !== this._playingPad) {
            this.repaintPad(this._queuedPad, 'static');
        }

        this._queuedPad = padIndex;

        // Paint new queued pad as pulsing (unless it's already playing)
        if (padIndex !== null && padIndex !== this._playingPad) {
            this.repaintPad(padIndex, 'pulsing');
        }
    },

    /**
     * Get pad index for a beat position (based on marker ranges)
     * @param {number} beat - Beat position
     * @returns {number|null} Pad index (0-31) or null if out of range
     */
    getPadIndexForBeat: function(beat) {
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return null;

        // Build sorted markers with their indices
        var markers = [];
        for (var i = 0; i < this.topLane.pads.length; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                markers.push({ index: i, position: marker.position().get() });
            }
        }
        if (markers.length === 0) return null;

        markers.sort(function(a, b) { return a.position - b.position; });

        // Find which marker range contains the beat (last marker at or before beat)
        for (var i = markers.length - 1; i >= 0; i--) {
            if (beat >= markers[i].position) {
                return markers[i].index;
            }
        }
        return null;
    },

    /**
     * Get color for a pad (marker index)
     * @param {number} padIndex - Pad index (0-31)
     * @returns {number|null} Launchpad color or null
     */
    getColorForPad: function(padIndex) {
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return null;
        var marker = markerBank.getItemAt(padIndex);
        if (!marker || !marker.exists().get()) return null;
        var color = marker.getColor();
        return Launchpad.bitwigColorToLaunchpad(color.red(), color.green(), color.blue());
    },

    /**
     * Repaint a pad with specified mode
     * @param {number} padIndex - Pad index (0-31)
     * @param {string} mode - 'static', 'pulsing', or 'flashing'
     */
    repaintPad: function(padIndex, mode) {
        var color = this.getColorForPad(padIndex);
        if (color === null) return;

        var padNote = this.topLane.pads[padIndex];
        if (mode === 'pulsing') {
            Pager.requestPaintPulsing(1, padNote, color);
        } else if (mode === 'flashing') {
            Pager.requestPaintFlashing(1, padNote, color);
        } else {
            Pager.requestPaint(1, padNote, color);
        }
    }
};
