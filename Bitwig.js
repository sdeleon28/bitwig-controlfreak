/**
 * Bitwig API abstraction
 */
class BitwigHW {
    constructor(deps) {
        this.host = deps.host;
        this.bitwigActions = deps.bitwigActions;
        this.debug = deps.debug;
        this.println = deps.println;

        this._trackBank = null;
        this._trackTree = null;
        this._trackDepths = [];
        this._arranger = null;
        this._markerBank = null;
        this._transport = null;
        this._application = null;
        this._effectTrackBank = null;
        this._fxTracks = [];
        this._cursorTrack = null;
        this._cursorDevice = null;
        this._remoteControls = null;
    }

    /**
     * Initialize Bitwig API
     * @param {Object} trackBank - Bitwig track bank object
     * @param {Object} transport - Bitwig transport object
     * @param {Object} [effectTrackBank] - Bitwig effect track bank object
     */
    init(trackBank, transport, effectTrackBank) {
        this._trackBank = trackBank;
        this._transport = transport;
        this._trackDepths = [];
        this._trackTree = null;

        if (effectTrackBank) {
            this._effectTrackBank = effectTrackBank;
        }

        // Create arranger and marker bank
        this._arranger = this.host.createArranger();
        if (this.debug) this.println("Arranger created: " + this._arranger);

        if (this._arranger && this._arranger.createCueMarkerBank) {
            this._markerBank = this._arranger.createCueMarkerBank(32);
            if (this.debug) this.println("Marker bank created with 32 markers");
        } else {
            this.println("WARNING: createCueMarkerBank not available on arranger object");
            this._markerBank = null;
        }

        // Mark interested in play position for bar navigation
        if (this._transport && this._transport.playPosition) {
            this._transport.playPosition().markInterested();
        }

        // Mark interested in tempo for encoder control
        if (this._transport && this._transport.tempo) {
            this._transport.tempo().markInterested();
        }

        // Mark interested in play start position for bar navigation
        if (this._transport && this._transport.playStartPosition) {
            this._transport.playStartPosition().markInterested();
        }

        // Mark interested in loop bounds for reading
        if (this._transport && this._transport.arrangerLoopStart) {
            this._transport.arrangerLoopStart().markInterested();
        }
        if (this._transport && this._transport.arrangerLoopDuration) {
            this._transport.arrangerLoopDuration().markInterested();
        }

        // Create application object for actions
        this._application = this.host.createApplication();
    }

    /**
     * Get marker bank
     * @returns {Object|null} Marker bank or null
     */
    getMarkerBank() {
        return this._markerBank;
    }

    /**
     * Get transport
     * @returns {Object|null} Transport or null
     */
    getTransport() {
        return this._transport;
    }

    /**
     * Set time selection (loop range) in arrangement
     * @param {number} startBeats - Start position in beats
     * @param {number} endBeats - End position in beats
     */
    setTimeSelection(startBeats, endBeats) {
        if (!this._transport) return;

        // Set loop start position
        var loopStart = this._transport.arrangerLoopStart();
        if (loopStart && loopStart.set) {
            loopStart.set(startBeats);
        }

        // Set loop duration (end - start)
        var loopDuration = this._transport.arrangerLoopDuration();
        if (loopDuration && loopDuration.set) {
            loopDuration.set(endBeats - startBeats);
        }

        if (this.debug) {
            this.println("Time selection set: " + startBeats + " to " + endBeats + " beats");
        }
    }

    /**
     * Clear time selection using Unselect All action
     */
    clearTimeSelection() {
        this.invokeAction(this.bitwigActions.UNSELECT_ALL);
        if (this.debug) this.println("Time selection cleared");
    }

    /**
     * Move playhead to position
     * @param {number} beats - Position in beats
     */
    setPlayheadPosition(beats) {
        if (!this._transport) return;

        this._transport.setPosition(beats);

        if (this.debug) {
            this.println("Playhead set to: " + beats + " beats");
        }
    }

    /**
     * Move playhead by a number of bars
     * @param {number} bars - Number of bars to move (positive = forward, negative = backward)
     */
    movePlayheadByBars(bars) {
        if (!this._transport) return;

        // Get current playhead position
        var playPosition = this._transport.playPosition();
        if (!playPosition) return;

        var currentBeats = playPosition.get();

        // Get time signature (assuming 4/4 for now, could be made dynamic)
        var beatsPerBar = 4;

        // Calculate new position
        var newBeats = currentBeats + (bars * beatsPerBar);

        // Don't go below 0
        if (newBeats < 0) {
            newBeats = 0;
        }

        // Set new position
        this._transport.setPosition(newBeats);

        if (this.debug) {
            this.println("Moved playhead by " + bars + " bars: " + currentBeats + " -> " + newBeats + " beats");
        }
    }

    /**
     * Enable arrangement recording
     * @param {boolean} enabled - True to enable
     */
    setArrangementRecord(enabled) {
        if (!this._transport) return;

        var recordEnabled = this._transport.isArrangerRecordEnabled();
        if (recordEnabled && recordEnabled.set) {
            recordEnabled.set(enabled);
        }

        if (this.debug) {
            this.println("Arrangement record: " + enabled);
        }
    }

    /**
     * Get track by ID
     * @param {number} id - Track ID (0-63)
     * @returns {Object|null} Track object or null if not found
     */
    getTrack(id) {
        if (!this._trackBank || id === undefined || id === null || id < 0 || id >= 64) {
            return null;
        }
        var track = this._trackBank.getItemAt(id);
        return track.exists().get() ? track : null;
    }

    /**
     * Get hierarchical track tree
     * @returns {BitwigTrack[]} Array of top-level tracks with nested children
     */
    getTrackTree() {
        if (this._trackTree) {
            return this._trackTree;
        }

        // Build tree from track bank
        var tree = [];
        var parentStack = [{ children: tree }];

        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);
            if (!track) continue;

            var trackInfo = {
                id: i,
                name: track.name().get(),
                isGroup: track.isGroup().get(),
                depth: this._trackDepths[i] || 0,
                children: []
            };

            // Truncate parent stack to current depth
            parentStack.length = trackInfo.depth + 1;

            // Get parent at current depth
            var parent = parentStack[trackInfo.depth] || parentStack[0];
            parent.children.push(trackInfo);

            // Update stack for this depth level
            parentStack[trackInfo.depth + 1] = trackInfo;
        }

        this._trackTree = tree;
        return tree;
    }

    /**
     * Get child tracks of a group
     * @param {number} id - Group track ID
     * @returns {BitwigTrack[]} Array of child tracks
     */
    getTrackChildren(id) {
        var tree = this.getTrackTree();

        // Find track in tree
        function findTrack(tracks, targetId) {
            for (var i = 0; i < tracks.length; i++) {
                if (tracks[i].id === targetId) {
                    return tracks[i];
                }
                var found = findTrack(tracks[i].children, targetId);
                if (found) return found;
            }
            return null;
        }

        var track = findTrack(tree, id);
        return track ? track.children : [];
    }

    /**
     * Get track color
     * @param {number} id - Track ID
     * @returns {BitwigColor|null} Color object or null
     */
    getTrackColor(id) {
        var track = this.getTrack(id);
        if (!track) return null;

        var color = track.color();
        return {
            red: color.red(),
            green: color.green(),
            blue: color.blue()
        };
    }

    /**
     * Get track volume
     * @param {number} id - Track ID
     * @returns {number} Volume value (0-1) or -1 if not found
     */
    getTrackVolume(id) {
        var track = this.getTrack(id);
        if (!track) return -1;

        return track.volume().get();
    }

    /**
     * Set track volume
     * @param {number} id - Track ID
     * @param {number} value - Volume value (0-1)
     */
    setTrackVolume(id, value) {
        var track = this.getTrack(id);
        if (!track) return;

        track.volume().set(value);
    }

    /**
     * Find track by name predicate
     * @param {Function} predicate - Function that tests track name
     * @returns {Object|null} First matching track or null
     */
    findTrackByName(predicate) {
        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);
            if (track && predicate(track.name().get())) {
                return track;
            }
        }
        return null;
    }

    /**
     * Update track depths (called after calculation)
     * @param {number[]} depths - Array of track depths
     */
    setTrackDepths(depths) {
        this._trackDepths = depths;
        this._trackTree = null; // Clear cache
    }

    /**
     * Clear cached data
     */
    clearCache() {
        this._trackTree = null;
    }

    /**
     * Get child tracks of a group
     * @param {number} groupTrackId - Group track ID
     * @returns {number[]} Array of child track IDs
     */
    getGroupChildren(groupTrackId) {
        var children = this.getTrackChildren(groupTrackId);
        return children.map(function(child) { return child.id; });
    }

    /**
     * Find group track by group number (any depth)
     * @param {number} groupNumber - Group number (1-16)
     * @returns {number|null} Track ID or null
     */
    findGroupByNumber(groupNumber) {
        var searchString = "(" + groupNumber + ")";

        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);

            // Find ANY group (any depth) with this number
            if (track && track.isGroup().get()) {
                var name = track.name().get();
                if (name.indexOf(searchString) !== -1) {
                    return i;
                }
            }
        }
        return null;
    }

    /**
     * Get all top-level tracks (depth 0)
     * @returns {number[]} Array of top-level track IDs
     */
    getTopLevelTracks() {
        var topLevel = [];
        for (var i = 0; i < 64; i++) {
            if (this._trackDepths[i] === 0) {
                var track = this.getTrack(i);
                if (track) {
                    topLevel.push(i);
                }
            }
        }
        return topLevel;
    }

    /**
     * Get cached FX tracks (from effect track bank)
     * @returns {Array} Array of {index, number, track} sorted by [N] number
     */
    getFxTracks() {
        return this._fxTracks;
    }

    /**
     * Update FX track cache when effect track name changes
     * @param {number} effectIndex - Index in effect track bank (0-7)
     * @param {string} name - Track name
     * @param {Object} track - Track object
     */
    _updateFxTrackCache(effectIndex, name, track) {
        // Remove any existing entry for this effect index
        this._fxTracks = this._fxTracks.filter(function(fx) {
            return fx.index !== effectIndex;
        });

        // Check if name has [N] pattern
        var match = name.match(/\[(\d+)\]/);
        if (match) {
            var fxNum = parseInt(match[1]);
            if (fxNum >= 1 && fxNum <= 8) {
                this._fxTracks.push({
                    index: effectIndex,  // Index in effect track bank (0-7)
                    number: fxNum,       // [N] from name -> encoder position
                    track: track
                });
                // Keep sorted by number
                this._fxTracks.sort(function(a, b) { return a.number - b.number; });
            }
        }
    }

    /**
     * Initialize cursor track/device for remote control linking
     * @param {Object} cursorTrack - Cursor track object
     * @param {Object} cursorDevice - Cursor device object
     * @param {Object} remoteControls - Remote controls page object
     */
    initCursor(cursorTrack, cursorDevice, remoteControls) {
        this._cursorTrack = cursorTrack;
        this._cursorDevice = cursorDevice;
        this._remoteControls = remoteControls;
        if (this.debug) this.println("Cursor track/device initialized");
    }

    /**
     * Get cursor track
     * @returns {Object|null} Cursor track or null
     */
    getCursorTrack() {
        return this._cursorTrack;
    }

    /**
     * Get cursor device
     * @returns {Object|null} Cursor device or null
     */
    getCursorDevice() {
        return this._cursorDevice;
    }

    /**
     * Get remote controls page
     * @returns {Object|null} Remote controls page or null
     */
    getRemoteControls() {
        return this._remoteControls;
    }

    /**
     * Select a track in mixer (XOR - deselects others)
     * @param {number} trackId - Track ID to select
     */
    selectTrack(trackId) {
        var track = this.getTrack(trackId);
        if (track) {
            track.selectInMixer();
            if (this.debug) this.println("Selected track " + trackId + ": " + track.name().get());
        }
    }

    /**
     * Invoke a Bitwig action by ID
     * @param {string} actionId - Action ID from BitwigActions constants
     */
    invokeAction(actionId) {
        this.println("invokeAction called with: " + actionId);
        if (!this._application) {
            this.println("ERROR: Application not initialized");
            return;
        }
        this.println("Application exists, getting action...");
        var action = this._application.getAction(actionId);
        this.println("Action result: " + action);
        if (action) {
            this.println("Invoking action: " + actionId);
            action.invoke();
            this.println("Action invoked successfully");
        } else {
            this.println("ERROR: Action not found: " + actionId);
        }
    }
}

var Bitwig = {};

if (typeof module !== 'undefined') module.exports = BitwigHW;
