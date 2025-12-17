/**
 * Project Explorer - detailed markers view (Page 2)
 * Self-contained namespace for page-specific marker navigation
 * @namespace
 */
var ProjectExplorer = {
    /**
     * Page number this namespace is bound to
     */
    pageNumber: 2,

    /**
     * Beats per bar (assumes 4/4 time)
     */
    beatsPerBar: 4.0,

    /**
     * Resolution: number of bars per pad (1, 2, 4, 8, 16, 32)
     */
    barsPerPad: 1,

    /**
     * Full 8x8 grid (64 pads) - top-to-bottom, left-to-right
     */
    pads: [
        81, 82, 83, 84, 85, 86, 87, 88,  // Row 7 (top): bars 0-7
        71, 72, 73, 74, 75, 76, 77, 78,  // Row 6: bars 8-15
        61, 62, 63, 64, 65, 66, 67, 68,  // Row 5: bars 16-23
        51, 52, 53, 54, 55, 56, 57, 58,  // Row 4: bars 24-31
        41, 42, 43, 44, 45, 46, 47, 48,  // Row 3: bars 32-39
        31, 32, 33, 34, 35, 36, 37, 38,  // Row 2: bars 40-47
        21, 22, 23, 24, 25, 26, 27, 28,  // Row 1: bars 48-55
        11, 12, 13, 14, 15, 16, 17, 18   // Row 0 (bottom): bars 56-63
    ],

    /**
     * Cache of sorted markers (rebuilt on refresh)
     * @private
     */
    _sortedMarkers: [],

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
     * Current page (0-indexed)
     * @private
     */
    _currentPage: 0,

    /**
     * Total number of pages
     * @private
     */
    _totalPages: 1,

    /**
     * Button definitions for pagination
     */
    buttons: {
        prevPage: 110,  // top7 (CC 110)
        nextPage: 111   // top8 (CC 111)
    },

    /**
     * Modifier buttons for gestures
     */
    modifiers: {
        timeSelect: 19,  // Record Arm button (note 19)
        copySelect: 29   // Solo button (note 29)
    },

    /**
     * Time selection gesture state
     * @private
     */
    _timeSelectActive: false,
    _timeSelectStartPad: null,
    _timeSelectOriginalColors: {},
    _timeSelectLastPress: 0,  // For double-click detection

    /**
     * Copy selection gesture state
     * @private
     */
    _copySelectActive: false,

    /**
     * Loop range state (from Bitwig observers)
     * @private
     */
    _loopStartBeat: 0,
    _loopDuration: 0,

    /**
     * Decrease resolution (zoom out - more bars per pad)
     */
    decreaseResolution: function() {
        if (this.barsPerPad < 32) {
            this.barsPerPad *= 2;
            this.refresh();
            host.showPopupNotification(this.barsPerPad + " bars/pad");
        }
    },

    /**
     * Increase resolution (zoom in - fewer bars per pad)
     */
    increaseResolution: function() {
        if (this.barsPerPad > 1) {
            this.barsPerPad /= 2;
            this.refresh();
            host.showPopupNotification(this.barsPerPad + " bars/pad");
        }
    },

    /**
     * Go to previous page
     */
    prevPage: function() {
        if (this._currentPage > 0) {
            this._currentPage--;
            this.refresh();
            this.refreshPageButtons();
            host.showPopupNotification("Page " + (this._currentPage + 1) + "/" + this._totalPages);
        }
    },

    /**
     * Go to next page
     */
    nextPage: function() {
        if (this._currentPage < this._totalPages - 1) {
            this._currentPage++;
            this.refresh();
            this.refreshPageButtons();
            host.showPopupNotification("Page " + (this._currentPage + 1) + "/" + this._totalPages);
        }
    },

    /**
     * Update page navigation button colors
     */
    refreshPageButtons: function() {
        // Only update when on this page
        if (Pager.getActivePage() !== this.pageNumber) return;

        // Previous page button
        if (this._currentPage > 0) {
            Launchpad.setTopButtonColor(this.buttons.prevPage, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(this.buttons.prevPage, 0);
        }

        // Next page button
        if (this._currentPage < this._totalPages - 1) {
            Launchpad.setTopButtonColor(this.buttons.nextPage, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(this.buttons.nextPage, 0);
        }
    },

    /**
     * Register click behaviors for bar pads
     */
    registerBehaviors: function() {
        var self = this;

        for (var i = 0; i < this.pads.length; i++) {
            (function(barIndex, padNote) {
                var clickCallback = function() {
                    self.jumpToBar(barIndex);
                };
                Launchpad.registerPadBehavior(padNote, clickCallback, null, self.pageNumber);
            })(i, this.pads[i]);
        }

        if (debug) println("ProjectExplorer behaviors registered for " + this.pads.length + " pads");
    },

    /**
     * Refresh bar-based display (one pad per bar, colored by closest previous marker)
     */
    refresh: function() {
        // Clear all 64 pads
        for (var i = 0; i < this.pads.length; i++) {
            Pager.requestClear(this.pageNumber, this.pads[i]);
        }

        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        // Build sorted list of markers with positions, colors, and marker refs
        var markers = [];
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                var color = marker.getColor();
                markers.push({
                    position: marker.position().get(),
                    color: Launchpad.bitwigColorToLaunchpad(color.red(), color.green(), color.blue()),
                    marker: marker  // Keep marker ref for launch()
                });
            }
        }

        if (markers.length === 0) {
            this._totalPages = 1;
            this._currentPage = 0;
            this.refreshPageButtons();
            return;
        }

        // Sort by position
        markers.sort(function(a, b) { return a.position - b.position; });
        this._sortedMarkers = markers;  // Cache for jumpToBar

        // Get first and last marker positions
        var firstBarBeat = markers[0].position;
        var lastBarBeat = markers[markers.length - 1].position;

        // Calculate content end: last marker + one pad's worth of bars
        // Pads beyond this are considered empty space and should stay off
        var lastContentBeat = lastBarBeat + (this.barsPerPad * this.beatsPerBar);

        // Calculate total bars needed (from first marker to last marker + some buffer)
        var totalBeats = lastBarBeat - firstBarBeat + (64 * this.barsPerPad * this.beatsPerBar);
        var totalBars = Math.ceil(totalBeats / this.beatsPerBar);
        var barsPerPage = 64 * this.barsPerPad;
        this._totalPages = Math.max(1, Math.ceil(totalBars / barsPerPage));

        // Clamp current page to valid range
        if (this._currentPage >= this._totalPages) {
            this._currentPage = this._totalPages - 1;
        }

        // Calculate page offset (in bars)
        var pageOffsetBars = this._currentPage * barsPerPage;

        // Display pads based on resolution and current page
        // Each pad represents barsPerPad bars
        for (var padIndex = 0; padIndex < 64; padIndex++) {
            var barIndex = pageOffsetBars + (padIndex * this.barsPerPad);  // First bar of this pad's range
            var barStartBeat = firstBarBeat + (barIndex * this.beatsPerBar);

            // Skip pads beyond content - keep them off (avoids conflict with time selection)
            if (barStartBeat >= lastContentBeat) {
                continue;
            }

            // Find color: closest marker at or before this bar
            var padColor = null;
            for (var m = markers.length - 1; m >= 0; m--) {
                if (markers[m].position <= barStartBeat) {
                    padColor = markers[m].color;
                    break;
                }
            }

            if (padColor !== null) {
                // Override with white if pad is within loop range
                if (this.isPadInLoopRange(padIndex)) {
                    padColor = Launchpad.colors.white;
                }
                Pager.requestPaint(this.pageNumber, this.pads[padIndex], padColor);
            }
        }

        // Update page buttons
        this.refreshPageButtons();

        if (debug) println("ProjectExplorer refreshed (barsPerPad: " + this.barsPerPad + ", page: " + (this._currentPage + 1) + "/" + this._totalPages + ")");
    },

    /**
     * Jump to a specific bar position (quantized when playing)
     * @param {number} padIndex - Pad index (0-63)
     */
    jumpToBar: function(padIndex) {
        if (this._sortedMarkers.length === 0) return;

        var firstBarBeat = this._sortedMarkers[0].position;
        // Convert pad index to bar index based on resolution and current page
        var pageOffsetBars = this._currentPage * 64 * this.barsPerPad;
        var barIndex = pageOffsetBars + (padIndex * this.barsPerPad);
        var targetBeat = firstBarBeat + (barIndex * this.beatsPerBar);

        // Set play start position to target bar, then launch (quantized)
        var transport = Bitwig.getTransport();
        if (transport) {
            transport.playStartPosition().set(targetBeat);
            transport.jumpToPlayStartPosition();
        }

        // Set this pad as queued (pulsing)
        this.setQueuedPad(padIndex);

        if (debug) println("ProjectExplorer: Launched to bar " + barIndex + " (beat " + targetBeat + ")");
    },

    /**
     * Set a pad as queued (pulsing until it starts playing)
     * @param {number} padIndex - Pad index (0-63)
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
     * Update the playhead indicator (called by playPosition observer)
     * @param {number} beat - Current playhead position in beats
     */
    updatePlayheadIndicator: function(beat) {
        if (Pager.getActivePage() !== this.pageNumber) return;

        var newPadIndex = this.getPadIndexForBeat(beat);
        if (newPadIndex === this._playingPad) return;

        // Restore previous playing pad to static
        if (this._playingPad !== null) {
            this.repaintPad(this._playingPad, 'static');
        }

        // Clear queued if we've arrived at the queued pad
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
     * Get pad index for a beat position
     * @param {number} beat - Beat position
     * @returns {number|null} Pad index (0-63) or null if out of range
     */
    getPadIndexForBeat: function(beat) {
        if (this._sortedMarkers.length === 0) return null;
        var firstBarBeat = this._sortedMarkers[0].position;
        if (beat < firstBarBeat) return null;

        var barIndex = Math.floor((beat - firstBarBeat) / this.beatsPerBar);
        var globalPadIndex = Math.floor(barIndex / this.barsPerPad);

        // Calculate which page this pad is on and the local pad index
        var pageOfPad = Math.floor(globalPadIndex / 64);
        var localPadIndex = globalPadIndex % 64;

        // Only return pad index if it's on the current page
        if (pageOfPad !== this._currentPage) return null;

        return (localPadIndex >= 0 && localPadIndex < 64) ? localPadIndex : null;
    },

    /**
     * Get color for a pad (accounting for current page)
     * @param {number} padIndex - Pad index (0-63)
     * @returns {number|null} Launchpad color or null
     */
    getColorForPad: function(padIndex) {
        if (this._sortedMarkers.length === 0) return null;
        var firstBarBeat = this._sortedMarkers[0].position;
        // Account for page offset
        var pageOffsetBars = this._currentPage * 64 * this.barsPerPad;
        var barIndex = pageOffsetBars + (padIndex * this.barsPerPad);
        var barStartBeat = firstBarBeat + (barIndex * this.beatsPerBar);

        for (var m = this._sortedMarkers.length - 1; m >= 0; m--) {
            if (this._sortedMarkers[m].position <= barStartBeat) {
                return this._sortedMarkers[m].color;
            }
        }
        return null;
    },

    /**
     * Repaint a pad with specified mode
     * @param {number} padIndex - Pad index (0-63)
     * @param {string} mode - 'static', 'pulsing', or 'flashing'
     */
    repaintPad: function(padIndex, mode) {
        // Use white only for: explicitly selected pads OR pads in loop range
        if (this._timeSelectOriginalColors[padIndex] !== undefined || this.isPadInLoopRange(padIndex)) {
            var padNote = this.pads[padIndex];
            if (mode === 'pulsing') {
                Pager.requestPaintPulsing(this.pageNumber, padNote, Launchpad.colors.white);
            } else if (mode === 'flashing') {
                Pager.requestPaintFlashing(this.pageNumber, padNote, Launchpad.colors.white);
            } else {
                Pager.requestPaint(this.pageNumber, padNote, Launchpad.colors.white);
            }
            return;
        }

        var color = this.getColorForPad(padIndex);
        if (color === null) return;

        var padNote = this.pads[padIndex];
        if (mode === 'pulsing') {
            Pager.requestPaintPulsing(this.pageNumber, padNote, color);
        } else if (mode === 'flashing') {
            Pager.requestPaintFlashing(this.pageNumber, padNote, color);
        } else {
            Pager.requestPaint(this.pageNumber, padNote, color);
        }
    },

    // ========================================================================
    // Time Selection Gesture
    // ========================================================================

    /**
     * Handle time select modifier press (Record Arm button)
     * Double-click clears the time selection
     */
    handleTimeSelectModifierPress: function() {
        var now = Date.now();
        var doubleClickThreshold = 400;  // ms

        if (now - this._timeSelectLastPress < doubleClickThreshold) {
            // Double-click: clear time selection
            Bitwig.clearTimeSelection();
            this._timeSelectLastPress = 0;
            return;
        }

        this._timeSelectLastPress = now;
        this._timeSelectActive = true;
        this._timeSelectStartPad = null;
        this._timeSelectOriginalColors = {};
        // Light modifier button white
        Launchpad.setPadColor(this.modifiers.timeSelect, Launchpad.colors.white);
    },

    /**
     * Handle time select modifier release
     */
    handleTimeSelectModifierRelease: function() {
        // Reset gesture state
        this.resetTimeSelectGesture();
        // Restore modifier button to normal (red for recordArm)
        Launchpad.setPadColor(this.modifiers.timeSelect, Launchpad.colors.red);
    },

    /**
     * Handle pad press during time selection gesture
     * @param {number} padNote - MIDI note number of pressed pad
     */
    handleTimeSelectPadPress: function(padNote) {
        var padIndex = this.pads.indexOf(padNote);
        if (padIndex === -1) return;  // Not a grid pad

        if (this._timeSelectStartPad === null) {
            // First tap - set start
            this._timeSelectStartPad = padIndex;
            this._timeSelectOriginalColors[padIndex] = this.getColorForPad(padIndex);
            Pager.requestPaint(this.pageNumber, padNote, Launchpad.colors.white);
        } else {
            // Second tap - set end
            var startPad = this._timeSelectStartPad;
            var endPad = padIndex;

            if (endPad < startPad) {
                // End before start - cancel
                this.resetTimeSelectGesture();
                return;
            }

            // Highlight full range white
            for (var i = startPad; i <= endPad; i++) {
                if (this._timeSelectOriginalColors[i] === undefined) {
                    this._timeSelectOriginalColors[i] = this.getColorForPad(i);
                }
                Pager.requestPaint(this.pageNumber, this.pads[i], Launchpad.colors.white);
            }

            // Calculate beats and make time selection
            var startBeat = this.getBeatForPad(startPad);
            var endBeat = this.getBeatForPad(endPad + 1);  // End of last pad
            Bitwig.setTimeSelection(startBeat, endBeat);

            // Clear original colors so they won't be restored on modifier release
            // The loop observers will handle painting via refresh()
            this._timeSelectOriginalColors = {};

            host.showPopupNotification("Time selection set");
        }
    },

    /**
     * Reset time selection gesture state and restore pad colors
     */
    resetTimeSelectGesture: function() {
        // Restore original pad colors
        for (var padIndex in this._timeSelectOriginalColors) {
            var color = this._timeSelectOriginalColors[padIndex];
            if (color !== null) {
                Pager.requestPaint(this.pageNumber, this.pads[padIndex], color);
            }
        }
        this._timeSelectActive = false;
        this._timeSelectStartPad = null;
        this._timeSelectOriginalColors = {};
    },

    /**
     * Refresh loop highlight when Bitwig's loop range changes.
     * Called by observers on arrangerLoopStart and arrangerLoopDuration.
     */
    refreshLoopHighlight: function() {
        // Only refresh if we're on the ProjectExplorer page
        if (Pager.getActivePage() !== this.pageNumber) return;
        this.refresh();
    },

    /**
     * Check if a pad falls within the current loop range
     * @param {number} padIndex - Pad index (0-63)
     * @returns {boolean} True if pad is within loop range
     */
    isPadInLoopRange: function(padIndex) {
        if (this._loopDuration <= 0) return false;
        if (this._sortedMarkers.length === 0) return false;

        var padStartBeat = this.getBeatForPad(padIndex);
        var padEndBeat = this.getBeatForPad(padIndex + 1);
        var loopEndBeat = this._loopStartBeat + this._loopDuration;

        // Pad is in range if it overlaps with loop range
        return padStartBeat < loopEndBeat && padEndBeat > this._loopStartBeat;
    },

    /**
     * Get beat position for start of a pad
     * @param {number} padIndex - Pad index (0-63)
     * @returns {number} Beat position
     */
    getBeatForPad: function(padIndex) {
        if (this._sortedMarkers.length === 0) return 0;
        var firstBarBeat = this._sortedMarkers[0].position;
        var pageOffsetBars = this._currentPage * 64 * this.barsPerPad;
        var barIndex = pageOffsetBars + (padIndex * this.barsPerPad);
        return firstBarBeat + (barIndex * this.beatsPerBar);
    },

    // ========================================================================
    // Copy Time Selection Gesture
    // ========================================================================

    /**
     * Handle copy select modifier press (Solo button)
     */
    handleCopySelectModifierPress: function() {
        if (this._loopDuration <= 0) {
            host.showPopupNotification("No time selection");
            return;
        }
        this._copySelectActive = true;
        Launchpad.setPadColor(this.modifiers.copySelect, Launchpad.colors.white);
    },

    /**
     * Handle copy select modifier release
     */
    handleCopySelectModifierRelease: function() {
        this._copySelectActive = false;
        Launchpad.setPadColor(this.modifiers.copySelect, Launchpad.colors.blue);
    },

    /**
     * Handle pad press during copy selection gesture
     * @param {number} padNote - MIDI note number of pressed pad
     */
    handleCopySelectPadPress: function(padNote) {
        var padIndex = this.pads.indexOf(padNote);
        if (padIndex === -1) return;

        var destBeat = this.getBeatForPad(padIndex);
        this.performDuplicateTime(destBeat);
    },

    /**
     * Duplicate the current time selection to a destination position
     * @param {number} destBeat - Destination beat position
     */
    performDuplicateTime: function(destBeat) {
        // TODO: Implement copy time selection feature
        // Workflow needs: time selection, mode switching, insert silence, split, copy, paste
        host.showPopupNotification("Copy feature not yet implemented");
    }
};
