/**
 * Project explorer page (page 2 of the Live controller).
 *
 * Shows ONE song at a time. A song is a marker set produced by
 * MarkerSets.groupMarkers — it has a name, startBeat, endBeat, and an
 * array of markers (the opening "{ song", any inner sections, and the
 * closing "}").
 *
 * Layout: an 8x8 launchpad grid. Each pad represents `barsPerPad` bars.
 * Pads fill in reading order: top-left (note 81) → top-right (88) →
 * row 7 (71..78) → ... → bottom row (11..18).
 *
 * Resolution: auto-picked so the song fits on one page (64 pads). Can
 * be manually overridden via cc 108 (decrease) / cc 109 (increase).
 * If a song still doesn't fit at the chosen resolution, it spans
 * multiple bar pages — see BarPager.
 *
 * Repaint discipline: pure function of state. On any marker update,
 * playhead crossing into a different song, song-pager change, or
 * loop range update, the page rebuilds its layout from scratch and
 * repaints all 64 pads.
 */
class PageProjectExplorerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.bitwig
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {Object} deps.host
     * @param {Object} deps.markerSets - MarkerSets module
     * @param {number} deps.pageNumber
     * @param {number} [deps.beatsPerBar=4]
     */
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig;
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.host = deps.host;
        this.markerSets = deps.markerSets;
        this.pageNumber = deps.pageNumber;
        this.beatsPerBar = deps.beatsPerBar || 4;

        this.pads = PageProjectExplorerHW.PADS;

        // State
        this._sets = [];
        this._currentSongIndex = -1;
        this._barsPerPad = 1;
        this._userOverrideResolution = false;
        this._padLayout = [];      // [{ color, bars, startBeat }, ...] one per pad slot in song-order
        this._currentBarPage = 0;  // 0-based
        this._totalBarPages = 1;
        this._playingPad = null;   // null or 0..63 (within current bar page)
        this._loopStartBeat = 0;
        this._loopDuration = 0;
        this._timeSelectActive = false;
        this._timeSelectStartPad = null;
    }

    init() {
        var self = this;

        // Click behaviors on every grid pad — seek to that pad's beat
        for (var i = 0; i < this.pads.length; i++) {
            (function(padIndex, padNote) {
                self.launchpad.registerPadBehavior(padNote, function() {
                    self._handlePadClick(padIndex);
                }, null, self.pageNumber);
            })(i, this.pads[i]);
        }

        // React to marker mutations: rebuild and repaint
        this.bitwig.onMarkersUpdated(function() {
            self.rebuildFromBitwig();
        });

        // React to playhead: auto-follow songs and update playhead pad
        this.bitwig.onPlayPosition(function(beats) {
            self._onPlayPosition(beats);
        });

        // Initial population (markers may not be loaded yet — caller should
        // schedule a delayed rebuild after Bitwig has populated the bank).
        this.rebuildFromBitwig();
    }

    /**
     * Read all markers from Bitwig, regroup into songs, pick the song
     * containing the current playhead (if any), and repaint.
     */
    rebuildFromBitwig() {
        var markers = this.bitwig.readMarkers();
        this._sets = this.markerSets.groupMarkers(markers);

        var beat = this.bitwig.getPlayPosition();
        var idx = this.markerSets.findSongIndexContainingBeat(this._sets, beat);
        if (idx >= 0) {
            this._currentSongIndex = idx;
        } else if (this._currentSongIndex >= this._sets.length) {
            this._currentSongIndex = this._sets.length - 1;
        } else if (this._currentSongIndex < 0 && this._sets.length > 0) {
            this._currentSongIndex = 0;
        }

        if (!this._userOverrideResolution) {
            this._autoResolution();
        }
        this._buildPadLayout();
        this._currentBarPage = 0;
        this.paint();
    }

    /**
     * Switch to a specific song (used by SongPager). Resets manual zoom
     * override so the new song picks its own auto resolution.
     */
    setSong(index) {
        if (index < 0 || index >= this._sets.length) return;
        if (index === this._currentSongIndex) return;
        this._currentSongIndex = index;
        this._userOverrideResolution = false;
        this._autoResolution();
        this._buildPadLayout();
        this._currentBarPage = 0;
        this.paint();
    }

    getCurrentSongIndex() { return this._currentSongIndex; }
    getSongCount() { return this._sets.length; }
    getSongs() { return this._sets; }

    /**
     * Manual zoom. Resets to auto on any subsequent song switch.
     */
    decreaseResolution() {
        if (this._barsPerPad >= 32) return;
        this._barsPerPad *= 2;
        this._userOverrideResolution = true;
        this._buildPadLayout();
        if (this._currentBarPage >= this._totalBarPages) {
            this._currentBarPage = Math.max(0, this._totalBarPages - 1);
        }
        if (this.host) this.host.showPopupNotification(this._barsPerPad + " bars/pad");
        this.paint();
    }

    increaseResolution() {
        if (this._barsPerPad <= 1) return;
        this._barsPerPad /= 2;
        this._userOverrideResolution = true;
        this._buildPadLayout();
        if (this._currentBarPage >= this._totalBarPages) {
            this._currentBarPage = Math.max(0, this._totalBarPages - 1);
        }
        if (this.host) this.host.showPopupNotification(this._barsPerPad + " bars/pad");
        this.paint();
    }

    // ----- Bar paging within a song (when content > 64 pads) -----

    barPagePrev() {
        if (this._currentBarPage <= 0) return;
        this._currentBarPage--;
        this.paint();
        if (this.host) this.host.showPopupNotification("Bar page " + (this._currentBarPage + 1) + "/" + this._totalBarPages);
    }

    barPageNext() {
        if (this._currentBarPage >= this._totalBarPages - 1) return;
        this._currentBarPage++;
        this.paint();
        if (this.host) this.host.showPopupNotification("Bar page " + (this._currentBarPage + 1) + "/" + this._totalBarPages);
    }

    getCurrentBarPage() { return this._currentBarPage; }
    getTotalBarPages() { return this._totalBarPages; }
    getBarsPerPad() { return this._barsPerPad; }

    // ----- Internal: layout calculation -----

    _currentSong() {
        if (this._currentSongIndex < 0 || this._currentSongIndex >= this._sets.length) return null;
        return this._sets[this._currentSongIndex];
    }

    _autoResolution() {
        var song = this._currentSong();
        if (!song) {
            this._barsPerPad = 1;
            return;
        }
        var totalBeats = song.endBeat - song.startBeat;
        var totalBars = Math.ceil(totalBeats / this.beatsPerBar);
        var resolutions = [1, 2, 4, 8, 16, 32];
        for (var i = 0; i < resolutions.length; i++) {
            if (Math.ceil(totalBars / resolutions[i]) <= 64) {
                this._barsPerPad = resolutions[i];
                return;
            }
        }
        this._barsPerPad = 32;
    }

    /**
     * Build pad layout for the current song. Each entry describes one pad:
     *   { color, bars, startBeat }
     * Partial pads at marker boundaries are kept in their own entries so
     * the next marker starts on a fresh pad.
     */
    _buildPadLayout() {
        this._padLayout = [];
        var song = this._currentSong();
        if (!song) {
            this._totalBarPages = 1;
            return;
        }

        // Build a list of (startBeat, color) breakpoints from non-closer markers
        var breakpoints = [];
        for (var i = 0; i < song.markers.length; i++) {
            var m = song.markers[i];
            if (this.markerSets.isCloser(m.name)) continue;
            var c = m.color;
            var color = this.launchpad.bitwigColorToLaunchpad(c.red, c.green, c.blue);
            breakpoints.push({ position: m.position, color: color });
        }
        breakpoints.sort(function(a, b) { return a.position - b.position; });

        var beatsPerPad = this._barsPerPad * this.beatsPerBar;
        var endBeat = song.endBeat;

        if (breakpoints.length === 0) {
            // Songs need an opener; if not, just bail
            this._totalBarPages = 1;
            return;
        }

        var currentBeat = breakpoints[0].position;
        var bpIndex = 0;
        var currentColor = breakpoints[0].color;

        while (currentBeat < endBeat) {
            // Advance breakpoint cursor to most-recent at currentBeat
            while (bpIndex + 1 < breakpoints.length && breakpoints[bpIndex + 1].position <= currentBeat) {
                bpIndex++;
                currentColor = breakpoints[bpIndex].color;
            }

            // Find this pad's end beat: earlier of (currentBeat + beatsPerPad),
            // (next breakpoint), or song endBeat.
            var theoreticalEnd = currentBeat + beatsPerPad;
            var actualEnd = theoreticalEnd;

            if (bpIndex + 1 < breakpoints.length) {
                var nextBp = breakpoints[bpIndex + 1].position;
                if (nextBp > currentBeat && nextBp < actualEnd) {
                    actualEnd = nextBp;
                }
            }
            if (actualEnd > endBeat) actualEnd = endBeat;

            this._padLayout.push({
                color: currentColor,
                bars: (actualEnd - currentBeat) / this.beatsPerBar,
                startBeat: currentBeat,
                endBeat: actualEnd
            });

            currentBeat = actualEnd;
        }

        this._totalBarPages = Math.max(1, Math.ceil(this._padLayout.length / 64));
    }

    /**
     * Repaint all 64 grid pads from current state.
     */
    paint() {
        // Clear nav button colors etc; we don't own those — bar pager / song pager do.
        for (var i = 0; i < 64; i++) {
            var note = this.pads[i];
            var globalIndex = this._currentBarPage * 64 + i;
            if (globalIndex >= this._padLayout.length) {
                this.pager.requestPaint(this.pageNumber, note, this.launchpad.colors.off);
                continue;
            }
            var entry = this._padLayout[globalIndex];
            var color = entry.color;
            // Loop range overrides color
            if (this._isPadInLoopRange(entry)) {
                color = this.launchpad.colors.white;
            }
            this.pager.requestPaint(this.pageNumber, note, color);
        }

        // Then re-stamp the playhead pad on top
        this._refreshPlayheadPad();
    }

    // ----- Loop range / time selection -----

    setLoopRange(startBeat, duration) {
        this._loopStartBeat = startBeat;
        this._loopDuration = duration;
        if (this.pager.isPageActive(this.pageNumber)) this.paint();
    }

    _isPadInLoopRange(entry) {
        if (this._loopDuration <= 0) return false;
        var loopEnd = this._loopStartBeat + this._loopDuration;
        return entry.startBeat < loopEnd && entry.endBeat > this._loopStartBeat;
    }

    // Time selection gesture: tap two pads to set a loop range.
    handleTimeSelectModifierPress() {
        this._timeSelectActive = true;
        this._timeSelectStartPad = null;
    }

    handleTimeSelectModifierRelease() {
        this._timeSelectActive = false;
        this._timeSelectStartPad = null;
    }

    isTimeSelectActive() { return this._timeSelectActive; }

    // ----- Pad click handler -----

    _handlePadClick(padIndex) {
        var globalIndex = this._currentBarPage * 64 + padIndex;
        if (globalIndex >= this._padLayout.length) return;
        var entry = this._padLayout[globalIndex];

        if (this._timeSelectActive) {
            if (this._timeSelectStartPad === null) {
                this._timeSelectStartPad = globalIndex;
                return;
            }
            var startGlobal = Math.min(this._timeSelectStartPad, globalIndex);
            var endGlobal = Math.max(this._timeSelectStartPad, globalIndex);
            var startEntry = this._padLayout[startGlobal];
            var endEntry = this._padLayout[endGlobal];
            this.bitwig.setTimeSelection(startEntry.startBeat, endEntry.endBeat);
            this._timeSelectStartPad = null;
            if (this.host) this.host.showPopupNotification("Time selection set");
            return;
        }

        // Plain seek
        this.bitwig.setPlayheadPosition(entry.startBeat);
    }

    // ----- Playhead -----

    _onPlayPosition(beats) {
        // Auto-follow: if the playhead has crossed into a different song,
        // switch to it.
        var idx = this.markerSets.findSongIndexContainingBeat(this._sets, beats);
        if (idx >= 0 && idx !== this._currentSongIndex) {
            this._currentSongIndex = idx;
            this._userOverrideResolution = false;
            this._autoResolution();
            this._buildPadLayout();
            this._currentBarPage = 0;
            this.paint();
            return;
        }

        // Same song: just update the playhead pad. Auto-page bar pages so
        // the playhead stays visible.
        this._refreshPlayheadPad(beats);
    }

    _padIndexForBeat(beat) {
        if (this._padLayout.length === 0) return null;
        for (var i = 0; i < this._padLayout.length; i++) {
            var e = this._padLayout[i];
            if (beat >= e.startBeat && beat < e.endBeat) return i;
        }
        return null;
    }

    _refreshPlayheadPad(beat) {
        if (beat === undefined) beat = this.bitwig.getPlayPosition();
        var globalIndex = this._padIndexForBeat(beat);
        if (globalIndex === null) {
            this._playingPad = null;
            return;
        }
        var pageOfPad = Math.floor(globalIndex / 64);
        if (pageOfPad !== this._currentBarPage) {
            // Auto-flip to the bar page that contains the playhead
            this._currentBarPage = pageOfPad;
            this.paint();
            return;
        }
        var localIndex = globalIndex % 64;
        if (this._playingPad === localIndex) return;

        // Restore previous playing pad to its base color
        if (this._playingPad !== null) {
            var prevGlobal = this._currentBarPage * 64 + this._playingPad;
            if (prevGlobal < this._padLayout.length) {
                var prevEntry = this._padLayout[prevGlobal];
                var prevColor = this._isPadInLoopRange(prevEntry) ? this.launchpad.colors.white : prevEntry.color;
                this.pager.requestPaint(this.pageNumber, this.pads[this._playingPad], prevColor);
            }
        }

        this._playingPad = localIndex;
        this.pager.requestPaintFlashing(this.pageNumber, this.pads[localIndex], this.launchpad.colors.white);
    }
}

// Pad layout — top-left to bottom-right reading order.
//   Top row    (row 8): 81..88
//   Row 7              : 71..78
//   ...
//   Bottom row (row 1): 11..18
PageProjectExplorerHW.PADS = (function() {
    var pads = [];
    for (var row = 8; row >= 1; row--) {
        for (var col = 1; col <= 8; col++) {
            pads.push(row * 10 + col);
        }
    }
    return pads;
})();

if (typeof module !== 'undefined') module.exports = PageProjectExplorerHW;
