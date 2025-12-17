/**
 * Launchpad top lane for marker navigation
 * @namespace
 */
var LaunchpadLane = {
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
    }
};
