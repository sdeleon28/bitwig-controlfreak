/**
 * Bitwig API abstraction (Live controller).
 *
 * Stripped-down: only what the Live controller needs.
 *  - Top-level track bank of 16 slots
 *  - Master track
 *  - Transport (with playPosition observer hook)
 *  - 256-slot cue marker bank
 *  - Time selection (arranger loop) read/write
 *  - Single onTracksUpdated subscription that fires on
 *      track create/delete/name/mute/solo/arm/color
 *  - Single onMarkersUpdated subscription that fires on
 *      marker create/delete/name/position/color
 *
 * No track tree, no group navigation, no effect track bank,
 * no cursor device, no remote controls, no FX bank.
 */
class BitwigHW {
    constructor(deps) {
        deps = deps || {};
        this.host = deps.host || null;
        this.bitwigActions = deps.bitwigActions || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._trackBank = null;
        this._masterTrack = null;
        this._transport = null;
        this._arranger = null;
        this._markerBank = null;
        this._application = null;

        this._tracksSubscribers = [];
        this._markersSubscribers = [];
        this._playPositionSubscribers = [];

        this._isLoopEnabled = false;
        this._isMetronomeEnabled = false;

        // Cached snapshot of (N) -> trackId mapping
        this._slotToTrackId = {};
    }

    // ----- Init -----

    init(options) {
        options = options || {};
        var trackBankSize = options.trackBankSize || 16;
        var markerBankSize = options.markerBankSize || 256;

        this._transport = this.host.createTransport();
        this._trackBank = this.host.createMainTrackBank(trackBankSize, 0, 0);
        this._masterTrack = this.host.createMasterTrack(0);
        this._application = this.host.createApplication();

        this._arranger = this.host.createArranger();
        if (this._arranger && this._arranger.createCueMarkerBank) {
            this._markerBank = this._arranger.createCueMarkerBank(markerBankSize);
        } else {
            this.println("WARNING: createCueMarkerBank not available on arranger");
            this._markerBank = null;
        }

        this._setupTransportObservers();
        this._setupTrackObservers(trackBankSize);
        this._setupMasterTrackObservers();
        this._setupMarkerObservers(markerBankSize);
    }

    _setupTransportObservers() {
        var t = this._transport;
        if (!t) return;
        t.playPosition().markInterested();
        t.tempo().markInterested();
        t.playStartPosition().markInterested();
        t.arrangerLoopStart().markInterested();
        t.arrangerLoopDuration().markInterested();
        t.isArrangerLoopEnabled().markInterested();
        t.isMetronomeEnabled().markInterested();

        var self = this;
        t.playPosition().addValueObserver(function(beats) {
            for (var i = 0; i < self._playPositionSubscribers.length; i++) {
                self._playPositionSubscribers[i](beats);
            }
        });
        t.isArrangerLoopEnabled().addValueObserver(function(enabled) {
            self._isLoopEnabled = enabled;
        });
        t.isMetronomeEnabled().addValueObserver(function(enabled) {
            self._isMetronomeEnabled = enabled;
        });
    }

    _setupTrackObservers(size) {
        var self = this;
        for (var i = 0; i < size; i++) {
            var track = this._trackBank.getItemAt(i);
            track.exists().markInterested();
            track.name().markInterested();
            track.mute().markInterested();
            track.solo().markInterested();
            track.arm().markInterested();
            track.color().markInterested();
            track.volume().markInterested();
            track.pan().markInterested();

            (function(trackId, t) {
                t.exists().addValueObserver(function() { self._emitTracksUpdated(); });
                t.name().addValueObserver(function() { self._emitTracksUpdated(); });
                t.mute().addValueObserver(function() { self._emitTracksUpdated(); });
                t.solo().addValueObserver(function() { self._emitTracksUpdated(); });
                t.arm().addValueObserver(function() { self._emitTracksUpdated(); });
                t.color().addValueObserver(function() { self._emitTracksUpdated(); });
            })(i, track);
        }
    }

    _setupMasterTrackObservers() {
        if (!this._masterTrack) return;
        this._masterTrack.name().markInterested();
        this._masterTrack.color().markInterested();
        this._masterTrack.volume().markInterested();
        this._masterTrack.pan().markInterested();
    }

    _setupMarkerObservers(size) {
        if (!this._markerBank) return;
        var self = this;
        for (var i = 0; i < size; i++) {
            var marker = this._markerBank.getItemAt(i);
            marker.exists().markInterested();
            marker.name().markInterested();
            marker.position().markInterested();
            marker.getColor().markInterested();

            marker.exists().addValueObserver(function() { self._emitMarkersUpdated(); });
            marker.name().addValueObserver(function() { self._emitMarkersUpdated(); });
            marker.position().addValueObserver(function() { self._emitMarkersUpdated(); });
            marker.getColor().addValueObserver(function() { self._emitMarkersUpdated(); });
        }
    }

    // ----- Subscriptions -----

    onTracksUpdated(callback) {
        this._tracksSubscribers.push(callback);
    }

    onMarkersUpdated(callback) {
        this._markersSubscribers.push(callback);
    }

    onPlayPosition(callback) {
        this._playPositionSubscribers.push(callback);
    }

    _emitTracksUpdated() {
        this._rebuildSlotMap();
        for (var i = 0; i < this._tracksSubscribers.length; i++) {
            this._tracksSubscribers[i]();
        }
    }

    _emitMarkersUpdated() {
        for (var i = 0; i < this._markersSubscribers.length; i++) {
            this._markersSubscribers[i]();
        }
    }

    // ----- Track access -----

    getTrackBankSize() {
        return this._trackBank ? 16 : 0;
    }

    getTrack(id) {
        if (!this._trackBank || id < 0) return null;
        var track = this._trackBank.getItemAt(id);
        return (track && track.exists().get()) ? track : null;
    }

    getMasterTrack() {
        return this._masterTrack;
    }

    /**
     * Re-scan top-level tracks and build a map of slot number → trackId
     * based on the (N) suffix convention. N must be 1..15.
     */
    _rebuildSlotMap() {
        this._slotToTrackId = {};
        if (!this._trackBank) return;
        var size = 16;
        for (var i = 0; i < size; i++) {
            var t = this._trackBank.getItemAt(i);
            if (!t || !t.exists().get()) continue;
            var name = t.name().get();
            var match = name && name.match(/\((\d+)\)/);
            if (!match) continue;
            var n = parseInt(match[1]);
            if (n >= 1 && n <= 15 && this._slotToTrackId[n] === undefined) {
                this._slotToTrackId[n] = i;
            }
        }
    }

    /**
     * Returns trackId for a given slot (1..15) or null if no such track.
     */
    getTrackIdForSlot(slotNumber) {
        var id = this._slotToTrackId[slotNumber];
        return id === undefined ? null : id;
    }

    /**
     * Snapshot of the current slot map ({1: trackId, 2: trackId, ...}).
     */
    getSlotMap() {
        var copy = {};
        for (var k in this._slotToTrackId) {
            if (this._slotToTrackId.hasOwnProperty(k)) copy[k] = this._slotToTrackId[k];
        }
        return copy;
    }

    // ----- Marker access -----

    getMarkerBank() {
        return this._markerBank;
    }

    /**
     * Read all existing markers as an array of plain objects:
     *   { index, name, position, color: { red, green, blue } }
     * Sorted by position.
     */
    readMarkers() {
        if (!this._markerBank) return [];
        var out = [];
        for (var i = 0; i < 256; i++) {
            var m = this._markerBank.getItemAt(i);
            if (!m || !m.exists().get()) continue;
            var c = m.getColor();
            out.push({
                index: i,
                name: m.name().get(),
                position: m.position().get(),
                color: { red: c.red(), green: c.green(), blue: c.blue() },
                marker: m
            });
        }
        out.sort(function(a, b) { return a.position - b.position; });
        return out;
    }

    // ----- Transport / time selection -----

    getTransport() {
        return this._transport;
    }

    getPlayPosition() {
        if (!this._transport) return 0;
        return this._transport.playPosition().get();
    }

    setTimeSelection(startBeats, endBeats) {
        if (!this._transport) return;
        this._transport.arrangerLoopStart().set(startBeats);
        this._transport.arrangerLoopDuration().set(endBeats - startBeats);
    }

    setPlayheadPosition(beats) {
        if (!this._transport) return;
        this._transport.setPosition(beats);
    }

    isLoopEnabled() { return this._isLoopEnabled; }
    isMetronomeEnabled() { return this._isMetronomeEnabled; }

    // ----- Actions -----

    invokeAction(actionId) {
        if (!this._application) return;
        var action = this._application.getAction(actionId);
        if (action) action.invoke();
    }
}

if (typeof module !== 'undefined') module.exports = BitwigHW;
