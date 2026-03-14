/**
 * Fav bar for quick track arming on row 5 (pads 51-58)
 * Toggled via Send B button; manages switching between QuickActions and FavBar modes
 */
class FavBarHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.host - Bitwig host
     * @param {Object} deps.quickActions - QuickActions instance
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.bitwig = deps.bitwig || null;
        this.host = deps.host || null;
        this.quickActions = deps.quickActions || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};
        this.onTrackSelected = deps.onTrackSelected || null;

        this._favMode = false;
        this.pads = [51, 52, 53, 54, 55, 56, 57, 58]; // row 5: fav slots {1}..{8}
        this._favTracks = {}; // slot (1-8) → trackId
        this._pageNumber = 1;
        this._setFavMode = false;
        this._pendingTrackId = null;
    }

    isFavMode() {
        return this._favMode;
    }

    toggleFavMode() {
        // If in set-fav gesture, cancel it instead of toggling
        if (this._setFavMode) {
            this.exitSetFavMode(this._pageNumber);
            return;
        }

        this._favMode = !this._favMode;

        if (this._favMode) {
            if (this.host) this.host.showPopupNotification("fav mode ON, quick actions OFF");
            if (this.quickActions) {
                this.quickActions.clear(this._pageNumber);
            }
            this._clearRow5Markers(this._pageNumber);
            this.registerFavBehaviors(this._pageNumber);
            this.refreshFavPads(this._pageNumber);
        } else {
            if (this.host) this.host.showPopupNotification("fav mode OFF, quick actions ON");
            this._clearFavPads(this._pageNumber);
            if (this.quickActions) {
                this.quickActions.registerBehaviors(this._pageNumber);
                this.quickActions.refresh(this._pageNumber);
            }
            this._restoreRow5Markers(this._pageNumber);
        }
    }

    registerFavBehaviors(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        var self = this;

        for (var i = 0; i < this.pads.length; i++) {
            (function(slot, padNote) {
                self.launchpad.registerPadBehavior(padNote, function() {
                    self._armFavTrack(slot);
                }, null, pageNumber);
            })(i + 1, this.pads[i]);
        }
    }

    _armFavTrack(slot) {
        var trackId = this._favTracks[slot];
        if (trackId === undefined || trackId === null) {
            if (this.host) this.host.showPopupNotification("No fav track in slot " + slot);
            return;
        }

        var track = this.bitwig.getTrack(trackId);
        if (!track) return;

        // XOR arm: disarm all, arm target
        for (var i = 0; i < 64; i++) {
            var otherTrack = this.bitwig.getTrack(i);
            if (otherTrack && i !== trackId) {
                otherTrack.arm().set(false);
            }
        }
        track.arm().set(true);
        track.makeVisibleInArranger();
        if (this.onTrackSelected) this.onTrackSelected(trackId);
    }

    refreshFavPads(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        if (!this._favMode) return;

        for (var i = 0; i < this.pads.length; i++) {
            var slot = i + 1;
            var trackId = this._favTracks[slot];
            this._repaintFavPad(i, trackId, pageNumber);
        }
    }

    _repaintFavPad(padIndex, trackId, pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = this._pageNumber;

        if (trackId === undefined || trackId === null) {
            this.pager.requestClear(pageNumber, this.pads[padIndex]);
            return;
        }

        var track = this.bitwig.getTrack(trackId);
        if (!track) {
            this.pager.requestClear(pageNumber, this.pads[padIndex]);
            return;
        }

        if (track.arm().get()) {
            var dimRed = this.launchpad.getBrightnessVariant(this.launchpad.colors.red, this.launchpad.brightness.dim);
            this.pager.requestPaint(pageNumber, this.pads[padIndex], dimRed);
        } else {
            var color = track.color();
            var launchpadColor = this.launchpad.bitwigColorToLaunchpad(
                color.red(), color.green(), color.blue()
            );
            var brightColor = this.launchpad.getBrightnessVariant(launchpadColor, this.launchpad.brightness.bright);
            this.pager.requestPaint(pageNumber, this.pads[padIndex], brightColor);
        }
    }

    onTrackArmChanged(trackId) {
        if (!this._favMode) return;
        for (var slot in this._favTracks) {
            if (this._favTracks[slot] === trackId) {
                var padIndex = parseInt(slot) - 1;
                this._repaintFavPad(padIndex, trackId);
                return;
            }
        }
    }

    scanFavTracks() {
        this._favTracks = {};
        for (var i = 0; i < 64; i++) {
            var track = this.bitwig.getTrack(i);
            if (!track) continue;
            var name = track.name().get();
            if (!name) continue;
            var match = name.match(/\{(\d+)\}/);
            if (match) {
                var slot = parseInt(match[1]);
                if (slot >= 1 && slot <= 8) {
                    this._favTracks[slot] = i;
                }
            }
        }
    }

    handleTrackNameChange(trackId, newName) {
        // Remove any existing mapping for this trackId
        for (var slot in this._favTracks) {
            if (this._favTracks.hasOwnProperty(slot) && this._favTracks[slot] === trackId) {
                delete this._favTracks[slot];
            }
        }

        // Check for {n} pattern
        if (newName) {
            var match = newName.match(/\{(\d+)\}/);
            if (match) {
                var slot = parseInt(match[1]);
                if (slot >= 1 && slot <= 8) {
                    this._favTracks[slot] = trackId;
                }
            }
        }

        // Refresh pads if in fav mode
        if (this._favMode) {
            this.refreshFavPads(this._pageNumber);
        }
    }

    isSetFavMode() {
        return this._setFavMode;
    }

    enterSetFavMode(trackId, pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = this._pageNumber;
        this._setFavMode = true;
        this._pendingTrackId = trackId;

        var track = this.bitwig.getTrack(trackId);
        var trackName = track ? track.name().get() : 'track';
        if (this.host) this.host.showPopupNotification(trackName + " → pick fav slot");

        var self = this;
        for (var i = 0; i < this.pads.length; i++) {
            this.pager.requestPaintFlashing(pageNumber, this.pads[i], this.launchpad.colors.white);
            (function(slot, padNote) {
                self.launchpad.registerPadBehavior(padNote, function() {
                    self._assignFavSlot(slot, pageNumber);
                }, null, pageNumber);
            })(i + 1, this.pads[i]);
        }
    }

    _assignFavSlot(slot, pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = this._pageNumber;
        var trackId = this._pendingTrackId;
        if (trackId === null || trackId === undefined) return;

        var track = this.bitwig.getTrack(trackId);
        if (!track) return;

        // Strip existing {M} from pending track
        var name = track.name().get();
        var cleanName = name.replace(/\s*\{\d+\}/, '');

        // Strip {slot} from any other track that currently claims this slot
        for (var i = 0; i < 64; i++) {
            if (i === trackId) continue;
            var other = this.bitwig.getTrack(i);
            if (!other) continue;
            var otherName = other.name().get();
            if (!otherName) continue;
            var match = otherName.match(/\{(\d+)\}/);
            if (match && parseInt(match[1]) === slot) {
                other.name().set(otherName.replace(/\s*\{\d+\}/, ''));
            }
        }

        // Set new name with {slot}
        track.name().set(cleanName + " {" + slot + "}");

        this._setFavMode = false;
        this._pendingTrackId = null;

        // Enter fav mode
        this._favMode = true;
        if (this.quickActions) {
            this.quickActions.clear(pageNumber);
        }
        this._clearRow5Markers(pageNumber);
        this.registerFavBehaviors(pageNumber);
        this.refreshFavPads(pageNumber);
    }

    exitSetFavMode(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = this._pageNumber;
        this._setFavMode = false;
        this._pendingTrackId = null;

        // Restore previous state
        if (this._favMode) {
            this.registerFavBehaviors(pageNumber);
            this.refreshFavPads(pageNumber);
        } else {
            this._clearFavPads(pageNumber);
            if (this.quickActions) {
                this.quickActions.registerBehaviors(pageNumber);
                this.quickActions.refresh(pageNumber);
            }
        }
    }

    activate(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        this._pageNumber = pageNumber;

        if (this._favMode) {
            this._clearRow5Markers(pageNumber);
            this.registerFavBehaviors(pageNumber);
            this.refreshFavPads(pageNumber);
        } else {
            if (this.quickActions) {
                this.quickActions.registerBehaviors(pageNumber);
                this.quickActions.refresh(pageNumber);
            }
        }
    }

    deactivate(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = this._pageNumber;
        // Nothing special needed; page hide clears behaviors
    }

    _clearFavPads(pageNumber) {
        for (var i = 0; i < this.pads.length; i++) {
            this.pager.requestClear(pageNumber, this.pads[i]);
            this.launchpad.clearPadBehavior(this.pads[i]);
        }
    }

    _clearRow5Markers(pageNumber) {
        // Clear pads 51-54 (markers that were in row 5's first 4 pads)
        for (var i = 51; i <= 54; i++) {
            this.pager.requestClear(pageNumber, i);
            this.launchpad.clearPadBehavior(i);
        }
        // Also clear 55-58 (quick action pads)
        for (var i = 55; i <= 58; i++) {
            this.pager.requestClear(pageNumber, i);
            this.launchpad.clearPadBehavior(i);
        }
    }

    _restoreRow5Markers(pageNumber) {
        // Re-register marker behaviors for pads 51-54 (row 5 first half)
        // The LaunchpadLane will handle this on next refresh cycle
        // Just clear fav behaviors for those pads
        for (var i = 51; i <= 54; i++) {
            this.launchpad.clearPadBehavior(i);
        }
    }
}

var FavBar = {};
if (typeof module !== 'undefined') module.exports = FavBarHW;
