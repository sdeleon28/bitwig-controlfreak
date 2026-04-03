/**
 * Project Explorer - detailed markers view (Page 2)
 * Self-contained namespace for page-specific marker navigation
 */
class ProjectExplorerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.launchpad - Launchpad hardware abstraction
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig || null;
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.pageNumber = ProjectExplorerHW.PAGE_NUMBER;
        this.beatsPerBar = ProjectExplorerHW.BEATS_PER_BAR;
        this.pads = ProjectExplorerHW.PADS;
        this.buttons = ProjectExplorerHW.BUTTONS;
        this.modifiers = ProjectExplorerHW.MODIFIERS;

        this.barsPerPad = 1;
        this._sortedMarkers = [];
        this._queuedPad = null;
        this._playingPad = null;
        this._currentPage = 0;
        this._totalPages = 1;
        this._timeSelectActive = false;
        this._timeSelectStartPad = null;
        this._timeSelectOriginalColors = {};
        this._loopStartBeat = 0;
        this._loopDuration = 0;
        this._padLayout = [];
    }

    /**
     * Decrease resolution (zoom out - more bars per pad)
     */
    decreaseResolution() {
        if (this.barsPerPad < 32) {
            this.barsPerPad *= 2;
            this.refresh();
            this.host.showPopupNotification(this.barsPerPad + " bars/pad");
        }
    }

    /**
     * Increase resolution (zoom in - fewer bars per pad)
     */
    increaseResolution() {
        if (this.barsPerPad > 1) {
            this.barsPerPad /= 2;
            this.refresh();
            this.host.showPopupNotification(this.barsPerPad + " bars/pad");
        }
    }

    /**
     * Go to previous page
     */
    prevPage() {
        if (this._currentPage > 0) {
            this._currentPage--;
            this.refresh();
            this.refreshPageButtons();
            this.host.showPopupNotification("Page " + (this._currentPage + 1) + "/" + this._totalPages);
        }
    }

    /**
     * Go to next page
     */
    nextPage() {
        if (this._currentPage < this._totalPages - 1) {
            this._currentPage++;
            this.refresh();
            this.refreshPageButtons();
            this.host.showPopupNotification("Page " + (this._currentPage + 1) + "/" + this._totalPages);
        }
    }

    /**
     * Update page navigation button colors
     */
    refreshPageButtons() {
        if (this.pager.getActivePage() !== this.pageNumber) return;

        if (this._currentPage > 0) {
            this.launchpad.setTopButtonColor(this.buttons.prevPage, this.launchpad.colors.purple);
        } else {
            this.launchpad.setTopButtonColor(this.buttons.prevPage, 0);
        }

        if (this._currentPage < this._totalPages - 1) {
            this.launchpad.setTopButtonColor(this.buttons.nextPage, this.launchpad.colors.purple);
        } else {
            this.launchpad.setTopButtonColor(this.buttons.nextPage, 0);
        }
    }

    /**
     * Register click behaviors for bar pads
     */
    registerBehaviors() {
        var self = this;

        for (var i = 0; i < this.pads.length; i++) {
            (function(barIndex, padNote) {
                var clickCallback = function() {
                    self.jumpToBar(barIndex);
                };
                self.launchpad.registerPadBehavior(padNote, clickCallback, null, self.pageNumber);
            })(i, this.pads[i]);
        }

        if (this.debug) this.println("ProjectExplorer behaviors registered for " + this.pads.length + " pads");
    }

    /**
     * Auto-calculate the best resolution to fit all content on one page
     */
    autoResolution() {
        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;

        var positions = [];
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                positions.push(marker.position().get());
            }
        }

        if (positions.length === 0) return;

        positions.sort(function(a, b) { return a - b; });
        var firstBeat = positions[0];
        var lastBeat = positions[positions.length - 1];

        var contentBars = Math.ceil((lastBeat - firstBeat) / this.beatsPerBar) + 1;

        var resolutions = [1, 2, 4, 8, 16, 32];
        for (var i = 0; i < resolutions.length; i++) {
            var bpp = resolutions[i];
            var padsNeeded = Math.ceil(contentBars / bpp);
            if (padsNeeded <= 64) {
                this.barsPerPad = bpp;
                this._currentPage = 0;
                if (this.debug) this.println("ProjectExplorer: Auto-resolution set to " + bpp + " bars/pad (" + padsNeeded + " pads needed)");
                return;
            }
        }

        this.barsPerPad = 32;
        this._currentPage = 0;
    }

    /**
     * Refresh bar-based display
     */
    refresh() {
        for (var i = 0; i < this.pads.length; i++) {
            this.pager.requestClear(this.pageNumber, this.pads[i]);
        }

        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;

        var markers = [];
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);
            if (marker && marker.exists().get()) {
                var color = marker.getColor();
                markers.push({
                    position: marker.position().get(),
                    color: this.launchpad.bitwigColorToLaunchpad(color.red(), color.green(), color.blue()),
                    marker: marker
                });
            }
        }

        if (markers.length === 0) {
            this._totalPages = 1;
            this._currentPage = 0;
            this.refreshPageButtons();
            return;
        }

        markers.sort(function(a, b) { return a.position - b.position; });
        this._sortedMarkers = markers;

        this.buildPadLayout();

        var firstBarBeat = markers[0].position;
        var lastBarBeat = markers[markers.length - 1].position;

        var lastContentBeat = lastBarBeat + (this.barsPerPad * this.beatsPerBar);

        var totalBeats = lastBarBeat - firstBarBeat + (64 * this.barsPerPad * this.beatsPerBar);
        var totalBars = Math.ceil(totalBeats / this.beatsPerBar);
        var barsPerPage = 64 * this.barsPerPad;
        this._totalPages = Math.max(1, Math.ceil(totalBars / barsPerPage));

        if (this._currentPage >= this._totalPages) {
            this._currentPage = this._totalPages - 1;
        }

        var pageOffsetPads = this._currentPage * 64;
        for (var padIndex = 0; padIndex < 64; padIndex++) {
            var globalPadIndex = pageOffsetPads + padIndex;

            if (globalPadIndex >= this._padLayout.length) {
                continue;
            }

            var padDesc = this._padLayout[globalPadIndex];
            var padColor = padDesc.color;

            if (this.isPadInLoopRange(padIndex)) {
                padColor = this.launchpad.colors.white;
            }

            this.pager.requestPaint(this.pageNumber, this.pads[padIndex], padColor);
        }

        this.refreshPageButtons();

        if (this.debug) this.println("ProjectExplorer refreshed (barsPerPad: " + this.barsPerPad + ", page: " + (this._currentPage + 1) + "/" + this._totalPages + ")");
    }

    /**
     * Build pad layout accounting for partial pads at marker boundaries
     */
    buildPadLayout() {
        if (this._sortedMarkers.length === 0) {
            this._padLayout = [];
            return;
        }

        this._padLayout = [];
        var currentBeat = this._sortedMarkers[0].position;
        var currentMarkerIndex = 0;
        var currentColor = this._sortedMarkers[0].color;

        var lastMarkerBeat = this._sortedMarkers[this._sortedMarkers.length - 1].position;
        var contentEndBeat = lastMarkerBeat + (this.barsPerPad * this.beatsPerBar);

        while (currentBeat < contentEndBeat) {
            while (currentMarkerIndex + 1 < this._sortedMarkers.length &&
                   this._sortedMarkers[currentMarkerIndex + 1].position <= currentBeat) {
                currentMarkerIndex++;
                currentColor = this._sortedMarkers[currentMarkerIndex].color;
            }

            var theoreticalEndBeat = currentBeat + (this.barsPerPad * this.beatsPerBar);

            var nextMarkerIndex = currentMarkerIndex + 1;
            var actualEndBeat = theoreticalEndBeat;
            var actualBars = this.barsPerPad;

            if (nextMarkerIndex < this._sortedMarkers.length) {
                var nextMarkerBeat = this._sortedMarkers[nextMarkerIndex].position;
                if (nextMarkerBeat > currentBeat && nextMarkerBeat < theoreticalEndBeat) {
                    actualEndBeat = nextMarkerBeat;
                    actualBars = (nextMarkerBeat - currentBeat) / this.beatsPerBar;
                }
            }

            this._padLayout.push({
                color: currentColor,
                bars: actualBars,
                startBeat: currentBeat
            });

            currentBeat = actualEndBeat;
        }
    }

    /**
     * Jump to a specific bar position
     * @param {number} padIndex - Pad index (0-63)
     */
    jumpToBar(padIndex) {
        if (this._sortedMarkers.length === 0) return;

        var targetBeat = this.getBeatForPad(padIndex);
        if (targetBeat === 0 && padIndex > 0) return;

        var transport = this.bitwig.getTransport();
        if (transport) {
            transport.playStartPosition().set(targetBeat);
            transport.jumpToPlayStartPosition();
        }

        this.setQueuedPad(padIndex);

        if (this.debug) this.println("ProjectExplorer: Jump to pad " + padIndex + " (beat " + targetBeat + ")");
    }

    /**
     * Set a pad as queued (pulsing until it starts playing)
     * @param {number} padIndex - Pad index (0-63)
     */
    setQueuedPad(padIndex) {
        if (this._queuedPad !== null && this._queuedPad !== this._playingPad) {
            this.repaintPad(this._queuedPad, 'static');
        }

        this._queuedPad = padIndex;

        if (padIndex !== null && padIndex !== this._playingPad) {
            this.repaintPad(padIndex, 'pulsing');
        }
    }

    /**
     * Update the playhead indicator
     * @param {number} beat - Current playhead position in beats
     */
    updatePlayheadIndicator(beat) {
        if (this.pager.getActivePage() !== this.pageNumber) return;

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

    /**
     * Get pad index for a beat position
     * @param {number} beat - Beat position
     * @returns {number|null} Pad index (0-63) or null if out of range
     */
    getPadIndexForBeat(beat) {
        if (this._sortedMarkers.length === 0) return null;
        var firstBarBeat = this._sortedMarkers[0].position;
        if (beat < firstBarBeat) return null;

        var barIndex = Math.floor((beat - firstBarBeat) / this.beatsPerBar);
        var globalPadIndex = Math.floor(barIndex / this.barsPerPad);

        var pageOfPad = Math.floor(globalPadIndex / 64);
        var localPadIndex = globalPadIndex % 64;

        if (pageOfPad !== this._currentPage) return null;

        return (localPadIndex >= 0 && localPadIndex < 64) ? localPadIndex : null;
    }

    /**
     * Get color for a pad (accounting for current page)
     * @param {number} padIndex - Pad index (0-63)
     * @returns {number|null} Launchpad color or null
     */
    getColorForPad(padIndex) {
        var pageOffsetPads = this._currentPage * 64;
        var globalPadIndex = pageOffsetPads + padIndex;

        if (globalPadIndex >= this._padLayout.length) return null;
        return this._padLayout[globalPadIndex].color;
    }

    /**
     * Repaint a pad with specified mode
     * @param {number} padIndex - Pad index (0-63)
     * @param {string} mode - 'static', 'pulsing', or 'flashing'
     */
    repaintPad(padIndex, mode) {
        if (this._timeSelectOriginalColors[padIndex] !== undefined || this.isPadInLoopRange(padIndex)) {
            var padNote = this.pads[padIndex];
            if (mode === 'pulsing') {
                this.pager.requestPaintPulsing(this.pageNumber, padNote, this.launchpad.colors.white);
            } else if (mode === 'flashing') {
                this.pager.requestPaintFlashing(this.pageNumber, padNote, this.launchpad.colors.white);
            } else {
                this.pager.requestPaint(this.pageNumber, padNote, this.launchpad.colors.white);
            }
            return;
        }

        var color = this.getColorForPad(padIndex);
        if (color === null) return;

        var padNote = this.pads[padIndex];
        if (mode === 'pulsing') {
            this.pager.requestPaintPulsing(this.pageNumber, padNote, color);
        } else if (mode === 'flashing') {
            this.pager.requestPaintFlashing(this.pageNumber, padNote, color);
        } else {
            this.pager.requestPaint(this.pageNumber, padNote, color);
        }
    }

    // ========================================================================
    // Time Selection Gesture
    // ========================================================================

    handleTimeSelectModifierPress() {
        this._timeSelectActive = true;
        this._timeSelectStartPad = null;
        this._timeSelectOriginalColors = {};
        this.launchpad.setPadColor(this.modifiers.timeSelect, this.launchpad.colors.white);
        this.refresh();
    }

    handleTimeSelectModifierRelease() {
        this.resetTimeSelectGesture();
        this.launchpad.setPadColor(this.modifiers.timeSelect, this.launchpad.colors.red);
    }

    handleTimeSelectPadPress(padNote) {
        var padIndex = this.pads.indexOf(padNote);
        if (padIndex === -1) return;

        if (this._timeSelectStartPad === null) {
            this._timeSelectStartPad = padIndex;
            this._timeSelectOriginalColors[padIndex] = this.getColorForPad(padIndex);
            this.pager.requestPaint(this.pageNumber, padNote, this.launchpad.colors.white);
        } else {
            var startPad = this._timeSelectStartPad;
            var endPad = padIndex;

            if (endPad < startPad) {
                this.resetTimeSelectGesture();
                return;
            }

            for (var i = startPad; i <= endPad; i++) {
                if (this._timeSelectOriginalColors[i] === undefined) {
                    this._timeSelectOriginalColors[i] = this.getColorForPad(i);
                }
                this.pager.requestPaint(this.pageNumber, this.pads[i], this.launchpad.colors.white);
            }

            var startBeat = this.getBeatForPad(startPad);

            var pageOffsetPads = this._currentPage * 64;
            var globalEndPadIndex = pageOffsetPads + endPad;
            var endPadDesc = this._padLayout[globalEndPadIndex];
            var endBeat = endPadDesc.startBeat + (endPadDesc.bars * this.beatsPerBar);

            this.bitwig.setTimeSelection(startBeat, endBeat);

            this.launchpad.resetClickTracking(this.modifiers.timeSelect);

            this._timeSelectOriginalColors = {};

            this.host.showPopupNotification("Time selection set");
        }
    }

    resetTimeSelectGesture() {
        this._timeSelectActive = false;
        this._timeSelectStartPad = null;
        this._timeSelectOriginalColors = {};
        this.refresh();
    }

    refreshLoopHighlight() {
        if (this.pager.getActivePage() !== this.pageNumber) return;
        if (this._timeSelectActive) return;
        this.refresh();
    }

    /**
     * Check if a pad falls within the current loop range
     * @param {number} padIndex - Pad index (0-63)
     * @returns {boolean} True if pad is within loop range
     */
    isPadInLoopRange(padIndex) {
        if (this._timeSelectActive) return false;
        if (this._loopDuration <= 0) return false;
        if (this._sortedMarkers.length === 0) return false;

        var padStartBeat = this.getBeatForPad(padIndex);
        var padEndBeat = this.getBeatForPad(padIndex + 1);
        var loopEndBeat = this._loopStartBeat + this._loopDuration;

        return padStartBeat < loopEndBeat && padEndBeat > this._loopStartBeat;
    }

    /**
     * Get beat position for start of a pad
     * @param {number} padIndex - Pad index (0-63)
     * @returns {number} Beat position
     */
    getBeatForPad(padIndex) {
        var pageOffsetPads = this._currentPage * 64;
        var globalPadIndex = pageOffsetPads + padIndex;

        if (globalPadIndex >= this._padLayout.length) return 0;
        return this._padLayout[globalPadIndex].startBeat;
    }
}

// Static constants
ProjectExplorerHW.PAGE_NUMBER = 2;
ProjectExplorerHW.BEATS_PER_BAR = 4.0;
ProjectExplorerHW.PADS = [
    81, 82, 83, 84, 85, 86, 87, 88,
    71, 72, 73, 74, 75, 76, 77, 78,
    61, 62, 63, 64, 65, 66, 67, 68,
    51, 52, 53, 54, 55, 56, 57, 58,
    41, 42, 43, 44, 45, 46, 47, 48,
    31, 32, 33, 34, 35, 36, 37, 38,
    21, 22, 23, 24, 25, 26, 27, 28,
    11, 12, 13, 14, 15, 16, 17, 18
];
ProjectExplorerHW.BUTTONS = {
    prevPage: 110,
    nextPage: 111
};
ProjectExplorerHW.MODIFIERS = {
    timeSelect: 19
};

var ProjectExplorer = {
    modifiers: ProjectExplorerHW.MODIFIERS,
    pads: ProjectExplorerHW.PADS,
    buttons: ProjectExplorerHW.BUTTONS
};
if (typeof module !== 'undefined') module.exports = ProjectExplorerHW;
