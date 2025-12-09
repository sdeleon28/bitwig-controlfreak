loadAPI(24);

host.defineController("Generic", "Launchpad + Twister", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(4, 2);  // 4 inputs (Launchpad, Twister, Roland Piano, nanoKEY2), 2 outputs

// Debug flag - set to true to enable verbose logging
var debug = true;

// ============================================================================
// Namespace Structure
// ============================================================================

/**
 * @typedef {Object} BitwigTrack
 * @property {number} id - Track index in bank (0-63)
 * @property {string} name - Track name
 * @property {boolean} isGroup - Whether track is a group
 * @property {number} depth - Hierarchy depth (0=top, 1=child, 2=grandchild)
 * @property {BitwigTrack[]} children - Child tracks
 */

/**
 * @typedef {Object} BitwigColor
 * @property {number} red - Red component (0-1)
 * @property {number} green - Green component (0-1)
 * @property {number} blue - Blue component (0-1)
 */

/**
 * Bitwig API abstraction
 * @namespace
 */
var Bitwig = {
    /**
     * Internal reference to track bank
     * @private
     */
    _trackBank: null,

    /**
     * Cached track tree structure
     * @private
     */
    _trackTree: null,

    /**
     * Track depth information
     * @private
     */
    _trackDepths: [],

    /**
     * Arranger for accessing markers
     * @private
     */
    _arranger: null,

    /**
     * Marker bank for cue markers
     * @private
     */
    _markerBank: null,

    /**
     * Transport for playback control
     * @private
     */
    _transport: null,

    /**
     * Effect track bank for FX/return tracks
     * @private
     */
    _effectTrackBank: null,

    /**
     * Cached FX tracks with [N] naming pattern
     * @private
     */
    _fxTracks: [],

    /**
     * Initialize Bitwig API
     * @param {Object} trackBank - Bitwig track bank object
     * @param {Object} transport - Bitwig transport object
     */
    init: function(trackBank, transport) {
        this._trackBank = trackBank;
        this._transport = transport;
        this._trackDepths = [];
        this._trackTree = null;

        // Create arranger and marker bank
        this._arranger = host.createArranger();
        if (debug) println("Arranger created: " + this._arranger);

        if (this._arranger && this._arranger.createCueMarkerBank) {
            this._markerBank = this._arranger.createCueMarkerBank(32);
            if (debug) println("Marker bank created with 32 markers");
        } else {
            println("WARNING: createCueMarkerBank not available on arranger object");
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
    },

    /**
     * Get marker bank
     * @returns {Object|null} Marker bank or null
     */
    getMarkerBank: function() {
        return this._markerBank;
    },

    /**
     * Get transport
     * @returns {Object|null} Transport or null
     */
    getTransport: function() {
        return this._transport;
    },

    /**
     * Set time selection (loop range) in arrangement
     * @param {number} startBeats - Start position in beats
     * @param {number} endBeats - End position in beats
     */
    setTimeSelection: function(startBeats, endBeats) {
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

        if (debug) {
            println("Time selection set: " + startBeats + " to " + endBeats + " beats");
        }
    },

    /**
     * Move playhead to position
     * @param {number} beats - Position in beats
     */
    setPlayheadPosition: function(beats) {
        if (!this._transport) return;

        this._transport.setPosition(beats);

        if (debug) {
            println("Playhead set to: " + beats + " beats");
        }
    },

    /**
     * Move playhead by a number of bars
     * @param {number} bars - Number of bars to move (positive = forward, negative = backward)
     */
    movePlayheadByBars: function(bars) {
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

        if (debug) {
            println("Moved playhead by " + bars + " bars: " + currentBeats + " -> " + newBeats + " beats");
        }
    },

    /**
     * Enable arrangement recording
     * @param {boolean} enabled - True to enable
     */
    setArrangementRecord: function(enabled) {
        if (!this._transport) return;

        var recordEnabled = this._transport.isArrangerRecordEnabled();
        if (recordEnabled && recordEnabled.set) {
            recordEnabled.set(enabled);
        }

        if (debug) {
            println("Arrangement record: " + enabled);
        }
    },

    /**
     * Get track by ID
     * @param {number} id - Track ID (0-63)
     * @returns {Object|null} Track object or null if not found
     */
    getTrack: function(id) {
        if (!this._trackBank || id < 0 || id >= 64) {
            return null;
        }
        var track = this._trackBank.getItemAt(id);
        return track.exists().get() ? track : null;
    },

    /**
     * Get hierarchical track tree
     * @returns {BitwigTrack[]} Array of top-level tracks with nested children
     */
    getTrackTree: function() {
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
    },

    /**
     * Get child tracks of a group
     * @param {number} id - Group track ID
     * @returns {BitwigTrack[]} Array of child tracks
     */
    getTrackChildren: function(id) {
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
    },

    /**
     * Get track color
     * @param {number} id - Track ID
     * @returns {BitwigColor|null} Color object or null
     */
    getTrackColor: function(id) {
        var track = this.getTrack(id);
        if (!track) return null;

        var color = track.color();
        return {
            red: color.red(),
            green: color.green(),
            blue: color.blue()
        };
    },

    /**
     * Get track volume
     * @param {number} id - Track ID
     * @returns {number} Volume value (0-1) or -1 if not found
     */
    getTrackVolume: function(id) {
        var track = this.getTrack(id);
        if (!track) return -1;

        return track.volume().get();
    },

    /**
     * Set track volume
     * @param {number} id - Track ID
     * @param {number} value - Volume value (0-1)
     */
    setTrackVolume: function(id, value) {
        var track = this.getTrack(id);
        if (!track) return;

        track.volume().set(value);
    },

    /**
     * Find track by name predicate
     * @param {Function} predicate - Function that tests track name
     * @returns {Object|null} First matching track or null
     */
    findTrackByName: function(predicate) {
        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);
            if (track && predicate(track.name().get())) {
                return track;
            }
        }
        return null;
    },

    /**
     * Update track depths (called after calculation)
     * @param {number[]} depths - Array of track depths
     */
    setTrackDepths: function(depths) {
        this._trackDepths = depths;
        this._trackTree = null; // Clear cache
    },

    /**
     * Clear cached data
     */
    clearCache: function() {
        this._trackTree = null;
    },

    /**
     * Get child tracks of a group
     * @param {number} groupTrackId - Group track ID
     * @returns {number[]} Array of child track IDs
     */
    getGroupChildren: function(groupTrackId) {
        var children = this.getTrackChildren(groupTrackId);
        return children.map(function(child) { return child.id; });
    },

    /**
     * Find group track by group number (any depth)
     * @param {number} groupNumber - Group number (1-16)
     * @returns {number|null} Track ID or null
     */
    findGroupByNumber: function(groupNumber) {
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
    },

    /**
     * Get all top-level tracks (depth 0)
     * @returns {number[]} Array of top-level track IDs
     */
    getTopLevelTracks: function() {
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
    },

    /**
     * Get cached FX tracks (from effect track bank)
     * @returns {Array} Array of {index, number, track} sorted by [N] number
     */
    getFxTracks: function() {
        return this._fxTracks;
    },

    /**
     * Update FX track cache when effect track name changes
     * @param {number} effectIndex - Index in effect track bank (0-7)
     * @param {string} name - Track name
     * @param {Object} track - Track object
     * @private
     */
    _updateFxTrackCache: function(effectIndex, name, track) {
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
        println("FX tracks cache updated: " + this._fxTracks.length + " tracks");
    }
};

/**
 * Roland Digital Piano MIDI transpose control
 * @namespace
 */
var RolandPiano = {
    /**
     * Internal reference to note input
     * @private
     */
    _noteInput: null,

    /**
     * Current transpose offset in semitones
     * @private
     */
    _transposeOffset: 0,

    /**
     * Initialize Roland Piano transpose
     */
    init: function() {
        // Create transposing note input for Roland Digital Piano
        // Port 2 should be configured to "Roland Digital Piano" in controller settings
        // This creates a separate input that users can select for transpose functionality
        this._noteInput = host.getMidiInPort(2).createNoteInput("Roland Piano (Transposed)", "??????");
        this._noteInput.setShouldConsumeEvents(true);  // Take full control of this MIDI port
        this._transposeOffset = 0;
        if (debug) println("Created 'Roland Piano (Transposed)' note input on port 2");
    },

    /**
     * Set transpose offset
     * @param {number} semitones - Transpose offset in semitones (can be negative)
     */
    setTranspose: function(semitones) {
        if (!this._noteInput) {
            println("ERROR: Piano note input not initialized");
            return;
        }

        this._transposeOffset = semitones;

        // Build key translation table (128 MIDI notes)
        var table = [];
        for (var i = 0; i < 128; i++) {
            var transposed = i + semitones;
            // Clamp to valid MIDI range (0-127)
            if (transposed < 0) transposed = 0;
            if (transposed > 127) transposed = 127;
            table[i] = transposed;
        }

        // Apply translation to note input
        this._noteInput.setKeyTranslationTable(table);

        println("Roland Piano transpose: " + semitones + " semitones");
    }
};

/**
 * nanoKEY2 hardware abstraction for key selection
 * @namespace
 */
var NanoKey2 = {
    /**
     * Key mapping: MIDI note -> key name, mode, and transpose semitones
     * First octave (C3-B3, MIDI 48-59): Major keys
     * Second octave (C4-B4, MIDI 60-71): Minor keys (using relative major transpose)
     */
    keyMap: {
        // Major keys (first octave: C3-B3, MIDI 48-59)
        48: { name: "C", semitones: -1, mode: "Major" },
        49: { name: "Db", semitones: 0, mode: "Major" },
        50: { name: "D", semitones: 1, mode: "Major" },
        51: { name: "Eb", semitones: 2, mode: "Major" },
        52: { name: "E", semitones: 3, mode: "Major" },
        53: { name: "F", semitones: 4, mode: "Major" },
        54: { name: "F#", semitones: 5, mode: "Major" },
        55: { name: "G", semitones: 6, mode: "Major" },
        56: { name: "G#", semitones: -6, mode: "Major" },
        57: { name: "A", semitones: -4, mode: "Major" },
        58: { name: "Bb", semitones: -3, mode: "Major" },
        59: { name: "B", semitones: -2, mode: "Major" },

        // Minor keys (second octave: C4-B4, MIDI 60-71)
        // Each minor key uses the transpose of its relative major (3 semitones higher)
        60: { name: "C", semitones: 2, mode: "Minor" },    // C minor = Eb major
        61: { name: "Db", semitones: 3, mode: "Minor" },   // Db minor = E major
        62: { name: "D", semitones: 4, mode: "Minor" },    // D minor = F major
        63: { name: "Eb", semitones: 5, mode: "Minor" },   // Eb minor = F# major
        64: { name: "E", semitones: 6, mode: "Minor" },    // E minor = G major
        65: { name: "F", semitones: -6, mode: "Minor" },   // F minor = G# major
        66: { name: "F#", semitones: -4, mode: "Minor" },  // F# minor = A major
        67: { name: "G", semitones: -3, mode: "Minor" },   // G minor = Bb major
        68: { name: "G#", semitones: -2, mode: "Minor" },  // G# minor = B major
        69: { name: "A", semitones: -1, mode: "Minor" },   // A minor = C major
        70: { name: "Bb", semitones: 0, mode: "Minor" },   // Bb minor = Db major
        71: { name: "B", semitones: 1, mode: "Minor" }     // B minor = D major
    },

    /**
     * Internal reference to note input
     * @private
     */
    _noteInput: null,

    /**
     * Currently selected key name
     * @private
     */
    _currentKey: "Db",

    /**
     * Initialize nanoKEY2 hardware
     */
    init: function() {
        // Create note input for nanoKEY2 on port 3
        // Port 3 should be configured to "nanoKEY2" in controller settings
        // This input allows MIDI callback to see events for key selection
        this._noteInput = host.getMidiInPort(3).createNoteInput("nanoKEY2 - Key Selector", "??????");
        this._noteInput.setShouldConsumeEvents(false);  // Allow MIDI callback to see events

        if (debug) println("Created 'nanoKEY2 - Key Selector' note input on port 3");
    },

    /**
     * Handle key selection from nanoKEY2
     * @param {number} midiNote - MIDI note number (48-59 for C-B)
     */
    handleKeySelection: function(midiNote) {
        var keyInfo = this.keyMap[midiNote];

        if (!keyInfo) {
            // Not a key selection note (outside supported ranges)
            return;
        }

        // Update current key
        this._currentKey = keyInfo.name;

        // Set transpose on Roland Piano
        RolandPiano.setTranspose(keyInfo.semitones);

        // Show notification with key and mode
        host.showPopupNotification("Key: " + keyInfo.name + " " + keyInfo.mode);

        if (debug) {
            println("Key selected: " + keyInfo.name + " " + keyInfo.mode +
                    " (" + keyInfo.semitones + " semitones)");
        }
    },

    /**
     * Get currently selected key name
     * @returns {string} Current key name
     */
    getCurrentKey: function() {
        return this._currentKey;
    }
};

/**
 * Page management system
 * @namespace
 */
var Pages = {
    /**
     * Registered pages (array of page objects)
     * @private
     */
    _pages: [],

    /**
     * Current page number
     * @private
     */
    _currentPageNumber: 1,

    /**
     * Total pages available
     * @private
     */
    _totalPages: 2,

    /**
     * Initialize pagination system
     */
    init: function() {
        this._currentPageNumber = 1;

        // Initialize all registered pages
        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].init) {
                this._pages[i].init();
            }
        }

        this.refreshPageButtons();
        this.showCurrentPage();

        if (debug) println("Pages initialized - " + this._pages.length + " pages registered");
    },

    /**
     * Register a page
     * @param {Object} pageObj - Page object implementing page interface
     */
    registerPage: function(pageObj) {
        this._pages.push(pageObj);

        // Update total pages based on highest page number
        if (pageObj.pageNumber > this._totalPages) {
            this._totalPages = pageObj.pageNumber;
        }

        if (debug) println("Registered page: " + pageObj.id + " (page " + pageObj.pageNumber + ")");
    },

    /**
     * Get page object by page number
     * @param {number} pageNum - Page number
     * @returns {Object|null} Page object or null
     */
    getPageByNumber: function(pageNum) {
        for (var i = 0; i < this._pages.length; i++) {
            if (this._pages[i].pageNumber === pageNum) {
                return this._pages[i];
            }
        }
        return null;
    },

    /**
     * Get current page object
     * @returns {Object|null} Current page object
     */
    getCurrentPage: function() {
        return this.getPageByNumber(this._currentPageNumber);
    },

    /**
     * Switch to page by number
     * @param {number} pageNum - Target page number
     */
    switchToPage: function(pageNum) {
        if (pageNum < 1 || pageNum > this._totalPages) return;
        if (pageNum === this._currentPageNumber) return;

        var oldPage = this.getCurrentPage();
        var newPage = this.getPageByNumber(pageNum);

        if (!newPage) {
            if (debug) println("Warning: No page registered for page " + pageNum);
            return;
        }

        if (debug) println("Switching from page " + this._currentPageNumber + " to page " + pageNum);

        // Notify old page it's hiding (but don't clear - Pager handles that)
        if (oldPage && oldPage.hide) {
            oldPage.hide();
        }

        // Flash page number animation
        var self = this;
        Animations.flashPageNumber(pageNum, function() {
            self._currentPageNumber = pageNum;

            // Let Pager handle hardware clear + repaint
            Pager.switchToPage(pageNum);

            // Clear old page behaviors before showing new page
            Launchpad.clearAllPadBehaviors();

            // Notify new page to update its state (will register its behaviors)
            self.showCurrentPage();
            self.refreshPageButtons();
        });
    },

    /**
     * Show current page
     */
    showCurrentPage: function() {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.show) {
            currentPage.show();
        }
    },

    /**
     * Navigate to next page
     */
    nextPage: function() {
        if (this._currentPageNumber < this._totalPages) {
            this.switchToPage(this._currentPageNumber + 1);
        }
    },

    /**
     * Navigate to previous page
     */
    previousPage: function() {
        if (this._currentPageNumber > 1) {
            this.switchToPage(this._currentPageNumber - 1);
        }
    },

    /**
     * Update page navigation button colors
     */
    refreshPageButtons: function() {
        // Previous page button (CC 104)
        if (this._currentPageNumber > 1) {
            Launchpad.setTopButtonColor(104, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(104, 0);
        }

        // Next page button (CC 105)
        if (this._currentPageNumber < this._totalPages) {
            Launchpad.setTopButtonColor(105, Launchpad.colors.purple);
        } else {
            Launchpad.setTopButtonColor(105, 0);
        }
    },

    /**
     * Delegate pad press to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadPress: function(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadPress) {
            return currentPage.handlePadPress(padNote);
        }
        return false;
    },

    /**
     * Delegate pad release to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadRelease: function(padNote) {
        var currentPage = this.getCurrentPage();
        if (currentPage && currentPage.handlePadRelease) {
            return currentPage.handlePadRelease(padNote);
        }
        return false;
    }
};

/**
 * Page state manager and hardware gatekeeper
 * Implements reactive "UI is a function of state" architecture
 * - Each page maintains its own state (desired pad colors)
 * - All paint requests go through Pager.requestPaint()
 * - Pager only updates hardware if request is from active page
 * - On page switch, Pager atomically clears and repaints stored state
 * @namespace
 */
var Pager = {
    /**
     * Per-page state storage
     * Structure: { pageNumber: { padNumber: colorValue, ... }, ... }
     */
    _pageStates: {},

    /**
     * Currently active page number
     */
    _activePage: 1,

    /**
     * Initialize Pager with empty states
     */
    init: function() {
        this._pageStates = {};
        this._activePage = 1;
        if (debug) println("Pager initialized - reactive page isolation enabled");
    },

    /**
     * Request a pad paint operation (gatekeeper)
     * Updates page state storage and paints to hardware only if page is active
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaint: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'static');
    },

    /**
     * Request painting a pad with flashing effect (hardware-accelerated)
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintFlashing: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'flashing');
    },

    /**
     * Request painting a pad with pulsing effect (hardware-accelerated)
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number (11-88)
     * @param {number} color - Launchpad color value
     */
    requestPaintPulsing: function(pageNumber, padNumber, color) {
        this._requestPaintWithMode(pageNumber, padNumber, color, 'pulsing');
    },

    /**
     * Internal: Paint pad with specified LED mode
     */
    _requestPaintWithMode: function(pageNumber, padNumber, color, mode) {
        // Initialize page state if needed
        if (!this._pageStates[pageNumber]) {
            this._pageStates[pageNumber] = {};
        }

        // Always update state storage (store both color and mode)
        this._pageStates[pageNumber][padNumber] = { color: color, mode: mode };

        // Only paint to hardware if this page is active
        if (pageNumber === this._activePage) {
            this._paintPadWithMode(padNumber, color, mode);
        }
    },

    /**
     * Internal: Paint to hardware with correct LED mode
     */
    _paintPadWithMode: function(padNumber, color, mode) {
        if (mode === 'flashing') {
            Launchpad.setPadColorFlashing(padNumber, color);
        } else if (mode === 'pulsing') {
            Launchpad.setPadColorPulsing(padNumber, color);
        } else {
            Launchpad.setPadColor(padNumber, color);
        }
    },

    /**
     * Request clearing a single pad
     * @param {number} pageNumber - Which page is making the request
     * @param {number} padNumber - MIDI note number to clear
     */
    requestClear: function(pageNumber, padNumber) {
        this.requestPaint(pageNumber, padNumber, Launchpad.colors.off);
    },

    /**
     * Request clearing all pads for a page
     * @param {number} pageNumber - Which page to clear
     */
    requestClearAll: function(pageNumber) {
        // Clear state storage
        this._pageStates[pageNumber] = {};

        // If this page is active, clear hardware too
        if (pageNumber === this._activePage) {
            for (var i = 0; i < 128; i++) {
                Launchpad.clearPad(i);
            }
        }
    },

    /**
     * Switch to a different page
     * Atomically clears hardware and repaints new page's stored state
     * @param {number} pageNumber - Page number to switch to
     */
    switchToPage: function(pageNumber) {
        if (pageNumber === this._activePage) return;

        var oldPage = this._activePage;
        this._activePage = pageNumber;

        if (debug) println("Pager: switching from page " + oldPage + " to page " + pageNumber);

        // Clear all hardware
        Launchpad.clearAll();

        // Repaint new page's stored state
        var pageState = this._pageStates[pageNumber] || {};
        for (var padNote in pageState) {
            if (pageState.hasOwnProperty(padNote)) {
                var pad = parseInt(padNote);
                var state = pageState[padNote];
                // Handle both old format (just color) and new format ({color, mode})
                if (typeof state === 'object' && state.color !== undefined) {
                    this._paintPadWithMode(pad, state.color, state.mode || 'static');
                } else {
                    Launchpad.setPadColor(pad, state);  // Legacy: just color value
                }
            }
        }
    },

    /**
     * Get current active page number
     * @returns {number} Active page number
     */
    getActivePage: function() {
        return this._activePage;
    },

    /**
     * Check if a page is currently active
     * @param {number} pageNumber - Page number to check
     * @returns {boolean} True if page is active
     */
    isPageActive: function(pageNumber) {
        return pageNumber === this._activePage;
    },

    /**
     * Get stored state for a page (for debugging)
     * @param {number} pageNumber - Page number
     * @returns {Object} State object {padNumber: color}
     */
    getPageState: function(pageNumber) {
        return this._pageStates[pageNumber] || {};
    }
};

/**
 * Animation system for visual effects
 * @namespace
 */
var Animations = {
    /**
     * Flash page number on pad grid
     * @param {number} pageNum - Page number to display
     * @param {Function} callback - Called when animation completes
     */
    flashPageNumber: function(pageNum, callback) {
        // Clear all pads
        for (var i = 0; i < 128; i++) {
            Launchpad.clearPad(i);
        }

        // Define number patterns (using pad grid)
        var numberPatterns = {
            1: [24, 34, 44, 54, 64, 74],  // Centered vertical line (aligned with 2 and 3)
            2: [
                // Improved "2" pattern
                72, 73, 74, 75,     // Top horizontal
                65, 75,             // Top right
                54, 55,             // Middle
                43,                 // Middle left
                32,                 // Bottom left
                22, 23, 24, 25      // Bottom horizontal
            ],
            3: [
                // "3" pattern
                72, 73, 74, 75,     // Top horizontal
                65,                 // Top right side
                53, 54, 55,         // Middle horizontal
                45,                 // Middle right side
                35,                 // Bottom right side
                22, 23, 24, 25      // Bottom horizontal
            ]
        };

        var pattern = numberPatterns[pageNum];
        if (!pattern) {
            if (callback) callback();
            return;
        }

        // Flash 2 times (faster)
        var flashCount = 0;
        var flashInterval = 80;  // Faster flashing

        function doFlash() {
            if (flashCount >= 4) {  // 2 on/off cycles
                // Animation complete
                if (callback) callback();
                return;
            }

            var isOn = flashCount % 2 === 0;
            for (var i = 0; i < pattern.length; i++) {
                if (isOn) {
                    Launchpad.setPadColor(pattern[i], Launchpad.colors.white);
                } else {
                    Launchpad.clearPad(pattern[i]);
                }
            }

            flashCount++;
            host.scheduleTask(doFlash, null, flashInterval);
        }

        doFlash();
    }
};

/**
 * @typedef {Object} LaunchpadColor
 * @property {number} value - MIDI color value for Launchpad
 */

/**
 * Launchpad hardware abstraction
 * @namespace
 */
var Launchpad = {
    // Hold timing configuration (milliseconds)
    holdTiming: {
        hold: 400  // Time to hold button before triggering hold action
    },

    // Launchpad color constants
    colors: {
        off: 0,
        green: 21,
        red: 5,
        amber: 17,
        yellow: 13,
        orange: 9,
        lime: 37,
        cyan: 41,
        blue: 45,
        purple: 49,
        pink: 53,
        white: 3
    },

    // Top row button CC numbers (circular buttons above grid)
    buttons: {
        top1: 104, top2: 105, top3: 106, top4: 107,
        top5: 108, top6: 109, top7: 110, top8: 111
    },

    // Brightness levels enum
    brightness: {
        dim: 'dim',
        bright: 'bright'
    },

    // Color brightness variants (dim and bright for each base color)
    colorVariants: {
        21: { dim: 19, bright: 23 },  // green
        5: { dim: 4, bright: 6 },      // red
        17: { dim: 11, bright: 9 },    // amber
        13: { dim: 12, bright: 14 },   // yellow
        45: { dim: 44, bright: 46 },   // blue
        41: { dim: 40, bright: 42 },   // cyan
        49: { dim: 48, bright: 50 },   // purple
        53: { dim: 4, bright: 95 },    // pink (dim is the nice pink we found!)
        3: { dim: 1, bright: 2 }       // white (trying inverted pattern)
    },

    /**
     * Internal reference to MIDI output
     * @private
     */
    _output: null,

    /**
     * Pad-to-track links
     * @private
     */
    _padLinks: {},

    /**
     * Track-to-pad reverse mapping
     * @private
     */
    _padToTrack: {},

    /**
     * Pad interaction tracking for click/hold behaviors
     * @private
     */
    _padTimers: {},

    /**
     * Clear all registered pad behaviors
     */
    clearAllPadBehaviors: function() {
        this._padTimers = {};
    },

    /**
     * Initialize Launchpad hardware
     * @param {Object} midiOutput - MIDI output port
     */
    init: function(midiOutput) {
        this._output = midiOutput;
        if (debug) println("Launchpad initialized: " + (midiOutput ? "Connected" : "NULL"));
    },

    /**
     * Set pad color
     * @param {number} padNumber - MIDI note number for pad
     * @param {number|string} color - Color value or color name from Launchpad.colors
     */
    setPadColor: function(padNumber, color) {
        if (!this._output) {
            if (debug) println("Warning: Launchpad not initialized");
            return;
        }

        var colorValue = color;

        // If color is a string, look it up in colors object
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (debug) println("Warning: Unknown color '" + color + "'");
                return;
            }
        }

        this._output.sendMidi(0x90, padNumber, colorValue);
    },

    /**
     * Set pad color with flashing effect (hardware-accelerated)
     * Flashing alternates on/off at MIDI clock rate (or 120 BPM if no clock)
     * @param {number} padNumber - MIDI note number
     * @param {number|string} color - Color value or color name
     */
    setPadColorFlashing: function(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x91, padNumber, colorValue);  // Channel 2 = Flashing
    },

    /**
     * Set pad color with pulsing effect (hardware-accelerated)
     * Pulsing fades in/out over 2 beats at MIDI clock rate
     * @param {number} padNumber - MIDI note number
     * @param {number|string} color - Color value or color name
     */
    setPadColorPulsing: function(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x92, padNumber, colorValue);  // Channel 3 = Pulsing
    },

    /**
     * Set top button color (uses CC message instead of note)
     * @param {number} ccNumber - CC number for button
     * @param {number|string} color - Color value or color name
     */
    setTopButtonColor: function(ccNumber, color) {
        if (!this._output) {
            if (debug) println("Warning: Launchpad not initialized");
            return;
        }

        var colorValue = color;

        // If color is a string, look it up in colors object
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (debug) println("Warning: Unknown color '" + color + "'");
                return;
            }
        }

        // Top buttons use CC messages (0xB0) not note messages
        this._output.sendMidi(0xB0, ccNumber, colorValue);
    },

    /**
     * Clear a pad (turn it off)
     * @param {number} padNumber - MIDI note number for pad
     */
    clearPad: function(padNumber) {
        this.setPadColor(padNumber, this.colors.off);
    },

    /**
     * Clear all pads
     */
    clearAll: function() {
        if (!this._output) return;

        for (var i = 0; i < 128; i++) {
            this.clearPad(i);
        }
    },

    /**
     * Enter programmer mode (required for Launchpad MK2)
     * SysEx: F0h 00h 20h 29h 02h 18h 21h 01h F7h
     */
    enterProgrammerMode: function() {
        if (!this._output) return;

        this._output.sendSysex("F0 00 20 29 02 18 21 01 F7");
        if (debug) println("Launchpad entered programmer mode");
    },

    /**
     * Exit programmer mode and return to Live mode
     * SysEx: F0h 00h 20h 29h 02h 18h 21h 00h F7h
     */
    exitProgrammerMode: function() {
        if (!this._output) return;

        this._output.sendSysex("F0 00 20 29 02 18 21 00 F7");
        if (debug) println("Launchpad exited programmer mode");
    },

    /**
     * Set multiple pads at once
     * @param {Object} padColors - Object mapping pad numbers to colors
     */
    setPads: function(padColors) {
        for (var pad in padColors) {
            if (padColors.hasOwnProperty(pad)) {
                this.setPadColor(parseInt(pad), padColors[pad]);
            }
        }
    },

    /**
     * Flash a pad (for visual feedback)
     * @param {number} padNumber - MIDI note number for pad
     * @param {number} color - Color to flash
     * @param {number} duration - Duration in milliseconds
     */
    flashPad: function(padNumber, color, duration) {
        var self = this;
        var originalColor = this.colors.off; // Store original state

        // Set flash color
        this.setPadColor(padNumber, color);

        // Restore after duration
        host.scheduleTask(function() {
            self.clearPad(padNumber);
        }, null, duration || 100);
    },

    /**
     * Map Bitwig RGB color to Launchpad color value
     * @param {number} red - Red component (0-1)
     * @param {number} green - Green component (0-1)
     * @param {number} blue - Blue component (0-1)
     * @returns {number} Launchpad color value (0-127)
     */
    bitwigColorToLaunchpad: function(red, green, blue) {
        var r = red > 0.5;
        var g = green > 0.5;
        var b = blue > 0.5;

        if (r && g && !b) return this.colors.yellow;
        if (r && !g && !b) return this.colors.red;
        if (!r && g && !b) return this.colors.green;
        if (!r && !g && b) return this.colors.blue;
        if (r && g && b) return this.colors.white;
        if (!r && g && b) return this.colors.cyan;
        if (r && !g && b) return this.colors.purple;
        return this.colors.amber;
    },

    /**
     * Get a brightness variant of a color
     * @param {number} baseColorValue - Base color value (0-127)
     * @param {string} brightnessLevel - Brightness level: 'dim' or 'bright' (use Launchpad.brightness.dim or .bright)
     * @returns {number} Adjusted color value (0-127)
     */
    getBrightnessVariant: function(baseColorValue, brightnessLevel) {
        // Look up variant in colorVariants table
        var variants = this.colorVariants[baseColorValue];

        if (variants && brightnessLevel) {
            // Return the requested brightness variant
            return variants[brightnessLevel] || baseColorValue;
        }

        // Fallback: return base color if no variant found
        return baseColorValue;
    },

    /**
     * Link a pad to a track for color feedback
     * @param {number} padNumber - MIDI note number for pad
     * @param {number} trackId - Track ID (0-63)
     * @param {number} pageNumber - Page number for paint request (optional, defaults to active page)
     */
    linkPadToTrack: function(padNumber, trackId, pageNumber) {
        var track = Bitwig.getTrack(trackId);
        if (!track) return;

        // Store link
        this._padLinks[padNumber] = {
            trackId: trackId,
            track: track
        };
        this._padToTrack[trackId] = padNumber;

        // Set color using centralized function
        var color = this.getTrackGridPadColor(trackId);

        Pager.requestPaint(pageNumber, padNumber, color);
    },

    /**
     * Get appropriate color for a track grid pad based on current mode and track state
     * @param {number} trackId - Track ID
     * @returns {number} Color value for the pad
     */
    getTrackGridPadColor: function(trackId) {
        var track = Bitwig.getTrack(trackId);
        if (!track) return this.colors.off;

        var currentMode = LaunchpadModeSwitcher.currentMode;
        var modeEnum = LaunchpadModeSwitcher.modeEnum;

        // Check mode-specific state
        if (currentMode === modeEnum.MUTE) {
            if (track.mute().get()) {
                // Muted: bright amber
                return this.getBrightnessVariant(this.colors.amber, this.brightness.bright);
            }
        } else if (currentMode === modeEnum.SOLO) {
            if (track.solo().get()) {
                // Soloed: bright yellow
                return this.getBrightnessVariant(this.colors.yellow, this.brightness.bright);
            }
        } else if (currentMode === modeEnum.RECORD_ARM) {
            if (track.arm().get()) {
                // Armed: bright red
                return this.getBrightnessVariant(this.colors.red, this.brightness.bright);
            }
        }

        // Default: show track color (dim variant)
        var color = track.color();
        var launchpadColor = this.bitwigColorToLaunchpad(color.red(), color.green(), color.blue());
        return this.getBrightnessVariant(launchpadColor, this.brightness.dim);
    },

    /**
     * Unlink a pad from its track
     * @param {number} padNumber - MIDI note number for pad
     */
    unlinkPad: function(padNumber) {
        if (this._padLinks[padNumber]) {
            var trackId = this._padLinks[padNumber].trackId;
            delete this._padToTrack[trackId];
            delete this._padLinks[padNumber];
            this.clearPad(padNumber);
        }
    },

    /**
     * Unlink all pads from their tracks
     */
    unlinkAllPads: function() {
        for (var pad in this._padLinks) {
            if (this._padLinks.hasOwnProperty(pad)) {
                this.clearPad(parseInt(pad));
            }
        }
        this._padLinks = {};
        this._padToTrack = {};
    },

    /**
     * Register click/hold behavior for a pad on a specific page
     * @param {number} padNote - MIDI note number
     * @param {Function} clickCallback - Function to call on click
     * @param {Function} holdCallback - Function to call on hold (optional)
     * @param {number} pageNumber - Page this behavior belongs to (required for isolation)
     */
    registerPadBehavior: function(padNote, clickCallback, holdCallback, pageNumber) {
        if (!this._padTimers[padNote]) {
            this._padTimers[padNote] = {};
        }

        this._padTimers[padNote].clickCallback = clickCallback;
        this._padTimers[padNote].holdCallback = holdCallback || null;
        this._padTimers[padNote].pressTime = null;
        this._padTimers[padNote].pageNumber = pageNumber || null;
    },

    /**
     * Handle pad press (called by Controller)
     * Only triggers if behavior belongs to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadPress: function(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;  // Not registered

        // Check page ownership - only handle if behavior belongs to current page
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== Pager.getActivePage()) {
            return false;  // Behavior belongs to different page
        }

        // Record when button was pressed
        padTimer.pressTime = Date.now();

        return true;  // Handled
    },

    /**
     * Handle pad release (called by Controller)
     * Only triggers if behavior belongs to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadRelease: function(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;  // Not registered

        // Check page ownership - only handle if behavior belongs to current page
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== Pager.getActivePage()) {
            return false;  // Behavior belongs to different page
        }

        // Calculate how long button was held
        var holdDuration = Date.now() - (padTimer.pressTime || 0);

        // Execute hold or click callback based on duration
        if (holdDuration >= this.holdTiming.hold && padTimer.holdCallback) {
            // Was held long enough - trigger hold action
            padTimer.holdCallback();
        } else if (padTimer.clickCallback) {
            // Quick press - trigger click action
            padTimer.clickCallback();
        }

        // Clean up
        padTimer.pressTime = null;

        return true;  // Handled
    }
};

/**
 * Launchpad quadrant configuration
 * @namespace
 */
var LaunchpadQuadrant = {
    /**
     * Bottom-right 4x4 quadrant for group selection
     */
    bottomRight: {
        /**
         * Pad note numbers (bottom-left to top-right, groups 1-16)
         */
        pads: [
            15, 16, 17, 18,  // Row 0 (bottom): groups 1-4
            25, 26, 27, 28,  // Row 1: groups 5-8
            35, 36, 37, 38,  // Row 2: groups 9-12
            45, 46, 47, 48   // Row 3 (top): groups 13-16
        ],

        /**
         * Map pad note number → group number (1-16)
         * @private
         */
        _padToGroup: null,

        /**
         * Initialize the quadrant
         */
        init: function() {
            // Build pad to group mapping
            this._padToGroup = {};
            for (var i = 0; i < this.pads.length; i++) {
                this._padToGroup[this.pads[i]] = i + 1;
            }
        },

        /**
         * Get group number for a pad
         * @param {number} padNote - MIDI note number
         * @returns {number|null} Group number (1-16) or null
         */
        getGroup: function(padNote) {
            return this._padToGroup[padNote] || null;
        },

        /**
         * Highlight a group on the Launchpad
         * @param {number} groupNumber - Group number (1-16)
         */
        highlightGroup: function(groupNumber) {
            // Clear all group selector pads
            for (var i = 0; i < this.pads.length; i++) {
                Launchpad.clearPad(this.pads[i]);
            }

            // Highlight selected group
            if (groupNumber >= 1 && groupNumber <= 16) {
                var padNote = this.pads[groupNumber - 1];
                Launchpad.setPadColor(padNote, 'green');
            }
        }
    },

    /**
     * Bottom-left 4x4 quadrant for track grid
     */
    bottomLeft: {
        /**
         * Pad note numbers (bottom-left to top-right, tracks 1-16)
         */
        pads: [
            11, 12, 13, 14,  // Row 0 (bottom): tracks 1-4
            21, 22, 23, 24,  // Row 1: tracks 5-8
            31, 32, 33, 34,  // Row 2: tracks 9-12
            41, 42, 43, 44   // Row 3 (top): tracks 13-16
        ],

        /**
         * Initialize the quadrant
         */
        init: function() {
            // No special initialization needed
        },

        /**
         * Get track number for a pad
         * @param {number} padNote - MIDI note number
         * @returns {number|null} Track number (1-16) or null
         */
        getTrackNumber: function(padNote) {
            var index = this.pads.indexOf(padNote);
            return index !== -1 ? index + 1 : null;
        }
    }
};

/**
 * Launchpad mode switcher (right-side buttons)
 * @namespace
 */
var LaunchpadModeSwitcher = {
    /**
     * Mode enum for type-safe mode references
     */
    modeEnum: {
        VOLUME: 'volume',
        PAN: 'pan',
        SEND_A: 'sendA',
        SEND_B: 'sendB',
        STOP: 'stop',
        MUTE: 'mute',
        SOLO: 'solo',
        RECORD_ARM: 'recordArm'
    },

    /**
     * Mode definitions with button note numbers and colors
     */
    modes: {
        volume: { note: 89, color: Launchpad.colors.green },      // Top
        pan: { note: 79, color: Launchpad.colors.pink },
        sendA: { note: 69, color: Launchpad.colors.purple },
        sendB: { note: 59, color: Launchpad.colors.purple },
        stop: { note: 49, color: Launchpad.colors.blue },
        mute: { note: 39, color: Launchpad.colors.amber },
        solo: { note: 29, color: Launchpad.colors.yellow },
        recordArm: { note: 19, color: Launchpad.colors.red }      // Bottom
    },

    /**
     * Currently selected mode
     * @private
     */
    currentMode: null,

    /**
     * Initialize mode switcher
     */
    init: function() {
        // Set default mode to volume
        this.selectMode(this.modeEnum.VOLUME);
    },

    /**
     * Select a mode (XOR - only one active at a time)
     * @param {string} modeName - Name of the mode to select
     */
    selectMode: function(modeName) {
        if (!this.modes[modeName]) {
            if (debug) println("Warning: Unknown mode '" + modeName + "'");
            return;
        }

        this.currentMode = modeName;
        this.refresh();

        // Refresh encoder LEDs based on new mode
        if (modeName === this.modeEnum.PAN) {
            Twister.refreshEncoderLEDsForPan();
        } else if (modeName === this.modeEnum.VOLUME) {
            Twister.refreshEncoderLEDsForVolume();
        }

        // Refresh track grid colors for modes that affect pad display
        Controller.refreshTrackGrid();
    },

    /**
     * Refresh all mode button colors
     * @param {number} pageNumber - Page number to paint to (default 1)
     */
    refresh: function(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;

        // Update all button colors
        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                var modeConfig = this.modes[mode];
                var baseColor = modeConfig.color;

                if (mode === this.currentMode) {
                    // Bright when active
                    var brightColor = Launchpad.getBrightnessVariant(baseColor, Launchpad.brightness.bright);
                    Pager.requestPaint(pageNumber, modeConfig.note, brightColor);
                } else {
                    // Dim when inactive
                    var dimColor = Launchpad.getBrightnessVariant(baseColor, Launchpad.brightness.dim);
                    Pager.requestPaint(pageNumber, modeConfig.note, dimColor);
                }
            }
        }
    },

    /**
     * Get mode name for a button note number
     * @param {number} note - MIDI note number
     * @returns {string|null} Mode name or null
     */
    getModeForNote: function(note) {
        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                if (this.modes[mode].note === note) {
                    return mode;
                }
            }
        }
        return null;
    }
};

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
     * Whether marker jumps should be quantized
     */
    quantizedJump: true,

    /**
     * Toggle pad note for quantized jump mode (bottom-right of top lane, marker 32)
     */
    QUANTIZE_TOGGLE_PAD: 58,

    /**
     * Initialize the lane
     */
    init: function() {
        this.topLane.init();
        // Note: registerMarkerPadBehaviors is called from Page_MainControl.show()
        if (debug) println("LaunchpadLane initialized");
    },

    /**
     * Register click and hold behaviors for marker pads
     */
    registerMarkerPadBehaviors: function() {
        var self = this;
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        for (var i = 0; i < this.topLane.pads.length; i++) {
            var padNote = this.topLane.pads[i];

            // Skip toggle pad - handled separately
            if (padNote === this.QUANTIZE_TOGGLE_PAD) continue;

            // Use closure to capture marker index
            (function(markerIndex) {
                // Click: jump to marker (quantized or immediate based on toggle)
                var clickCallback = function() {
                    var marker = markerBank.getItemAt(markerIndex);
                    if (marker && marker.exists().get()) {
                        marker.launch(self.quantizedJump);
                        if (debug) println("Jumped to marker " + markerIndex + (self.quantizedJump ? " (quantized)" : " (immediate)"));
                    }
                };

                // Hold: prepare recording at marker
                var holdCallback = function() {
                    Controller.prepareRecordingAtMarker(markerIndex);
                };

                // Register both behaviors - main control page only
                Launchpad.registerPadBehavior(padNote, clickCallback, holdCallback, Page_MainControl.pageNumber);
            })(i);
        }

        // Register toggle behavior for quantize mode
        Launchpad.registerPadBehavior(this.QUANTIZE_TOGGLE_PAD, function() {
            self.quantizedJump = !self.quantizedJump;
            self.updateQuantizeToggleLED();
            host.showPopupNotification(self.quantizedJump ? "Quantized Jump" : "Immediate Jump");
        }, null, Page_MainControl.pageNumber);

        // Update toggle LED to reflect initial state
        this.updateQuantizeToggleLED();

        if (debug) println("Marker pad behaviors registered");
    },

    /**
     * Update the quantize toggle LED to reflect current state
     */
    updateQuantizeToggleLED: function() {
        var page = Page_MainControl.pageNumber;
        if (this.quantizedJump) {
            // Pink for quantized mode
            Pager.requestPaint(page, this.QUANTIZE_TOGGLE_PAD, Launchpad.colors.pink);
        } else {
            // Yellow for immediate mode
            Pager.requestPaint(page, this.QUANTIZE_TOGGLE_PAD, Launchpad.colors.yellow);
        }
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

        // Update quantize toggle LED
        this.updateQuantizeToggleLED();

        if (debug) println("LaunchpadLane refreshed for page " + pageNumber);
    }
};

/**
 * Launchpad top control buttons (circular buttons above grid)
 * @namespace
 */
var LaunchpadTopButtons = {
    /**
     * Button function mappings (uses Launchpad.buttons constants)
     */
    buttons: {
        previousPage: Launchpad.buttons.top1,
        nextPage: Launchpad.buttons.top2,
        barBack: Launchpad.buttons.top3,
        barForward: Launchpad.buttons.top4
        // Note: Modifier buttons (like duplicate) are configured in ClipGestures
    },

    /**
     * Initialize control buttons
     */
    init: function() {
        // Page buttons will be managed by Pages.refreshPageButtons()

        // Set button colors for bar navigation - use CC message for top buttons
        Launchpad.setTopButtonColor(this.buttons.barBack, Launchpad.colors.pink);
        Launchpad.setTopButtonColor(this.buttons.barForward, Launchpad.colors.pink);

        // Register button handlers
        this.registerBarNavigation();

        if (debug) println("LaunchpadTopButtons initialized");
    },

    /**
     * Register bar navigation button handlers
     */
    registerBarNavigation: function() {
        // Note: These buttons send CC messages (0xB0), not note messages
        // They will be handled in Controller.onLaunchpadMidi via handleTopButtonCC
        if (debug) {
            println("Bar navigation buttons use CC:");
            println("  Bar back: CC " + this.buttons.barBack);
            println("  Bar forward: CC " + this.buttons.barForward);
        }
    },

    /**
     * Handle top button CC message
     * @param {number} cc - CC number
     * @param {number} value - CC value (127 = pressed, 0 = released)
     * @returns {boolean} True if handled
     */
    handleTopButtonCC: function(cc, value) {
        // Check ClipGestures modifiers (only on clip launcher page)
        if (Pager.getActivePage() === ClipLauncher.pageNumber) {
            if (value === 127) {
                if (ClipGestures.handleModifierPress(cc)) return true;
            } else {
                if (ClipGestures.handleModifierRelease(cc)) return true;
            }
        }

        // Only handle button press (value > 0) for other buttons
        if (value === 0) return false;

        // Page navigation (works on all pages)
        if (cc === this.buttons.previousPage) {
            Pages.previousPage();
            return true;
        }

        if (cc === this.buttons.nextPage) {
            Pages.nextPage();
            return true;
        }

        // Bar navigation (works on all pages - page-independent)
        if (cc === this.buttons.barBack) {
            println("Bar back button pressed!");
            Bitwig.movePlayheadByBars(-1);
            return true;
        }

        if (cc === this.buttons.barForward) {
            println("Bar forward button pressed!");
            Bitwig.movePlayheadByBars(1);
            return true;
        }

        return false;
    }
};

/**
 * Main control page - groups, markers, modes, track grid
 * TO MOVE THIS PAGE: Just change pageNumber property
 * @namespace
 */
var Page_MainControl = {
    id: "main-control",
    pageNumber: 1,  // ← Change this to move to different page number

    init: function() {
        // Existing init is already done by other namespaces
        if (debug) println("Page_MainControl initialized on page " + this.pageNumber);
    },

    show: function() {
        // Register pad behaviors for this page
        LaunchpadLane.registerMarkerPadBehaviors();

        // Display all main control elements (pass page number to use Pager)
        Controller.refreshGroupDisplay();
        Controller.refreshTrackGrid();  // Also registers track pad behaviors
        LaunchpadLane.refresh(1);
        LaunchpadModeSwitcher.refresh(1);
    },

    hide: function() {
        // Pager handles clearing on page switch - no action needed
        // State is preserved in Controller, Twister, etc.
        if (debug) println("Hiding main control page");
    },

    handlePadPress: function(padNote) {
        // Try pad behavior system (mode buttons, track grid, markers)
        if (Launchpad.handlePadPress(padNote)) {
            return true;
        }

        // Check group selector
        var groupNum = LaunchpadQuadrant.bottomRight.getGroup(padNote);
        if (groupNum) {
            Controller.selectGroup(groupNum);
            return true;
        }

        return false;
    },

    handlePadRelease: function(padNote) {
        return Launchpad.handlePadRelease(padNote);
    }
};

/**
 * Demo page showing page switching works
 * TO MOVE THIS PAGE: Just change pageNumber property
 * @namespace
 */
var Page_ClipLauncher = {
    id: "clip-launcher",
    pageNumber: 2,  // ← Change this to move to different page number

    init: function() {
        if (debug) println("Page_ClipLauncher initialized on page " + this.pageNumber);
    },

    show: function() {
        // Register pad behaviors for this page
        ClipLauncher.registerPadBehaviors();

        // Clear this page's state using Pager
        Pager.requestClearAll(this.pageNumber);

        // Clear mode buttons (not used on this page)
        for (var mode in LaunchpadModeSwitcher.modes) {
            if (LaunchpadModeSwitcher.modes.hasOwnProperty(mode)) {
                Pager.requestClear(this.pageNumber, LaunchpadModeSwitcher.modes[mode].note);
            }
        }

        // Refresh all clip states (will use Pager internally)
        ClipLauncher.refresh();
    },

    hide: function() {
        // Pager handles clearing on page switch - no action needed
        if (debug) println("Hiding clip launcher page");
    },

    handlePadPress: function(padNote) {
        // Convert pad note to row/column
        var row = Math.floor(padNote / 10);
        var col = padNote % 10;

        // Validate: columns 1-8, rows 1-8
        if (col < 1 || col > 8 || row < 1 || row > 8) {
            return false;
        }

        // Row 8 = scene launch buttons (immediate, no hold)
        if (row === 8) {
            var sceneIndex = col - 1;
            ClipLauncher.launchScene(sceneIndex);
            if (debug) println("Launch scene " + sceneIndex);
            return true;
        }

        // Rows 1-7 = clip pads - delegate to Launchpad behavior system
        return Launchpad.handlePadPress(padNote);
    },

    handlePadRelease: function(padNote) {
        var row = Math.floor(padNote / 10);
        // Rows 1-7 = clip pads - delegate to Launchpad behavior system
        if (row >= 1 && row <= 7) {
            return Launchpad.handlePadRelease(padNote);
        }
        return false;
    }
};

/**
 * Third demo page with diagonal pattern
 * TO MOVE THIS PAGE: Just change pageNumber property
 * @namespace
 */
var Page_ThirdDummy = {
    id: "third-dummy",
    pageNumber: 3,  // ← Change this to move to different page number

    init: function() {
        if (debug) println("Page_ThirdDummy initialized on page " + this.pageNumber);
    },

    show: function() {
        // Clear all pads
        for (var i = 0; i < 128; i++) {
            Launchpad.clearPad(i);
        }

        // Show different pattern - diagonal line from bottom-left to top-right
        Launchpad.setPadColor(11, Launchpad.colors.purple);   // Bottom-left
        Launchpad.setPadColor(22, Launchpad.colors.purple);
        Launchpad.setPadColor(33, Launchpad.colors.purple);
        Launchpad.setPadColor(44, Launchpad.colors.purple);
        Launchpad.setPadColor(55, Launchpad.colors.purple);
        Launchpad.setPadColor(66, Launchpad.colors.purple);
        Launchpad.setPadColor(77, Launchpad.colors.purple);
        Launchpad.setPadColor(88, Launchpad.colors.purple);   // Top-right

        // Clear mode buttons (not used on this page)
        for (var mode in LaunchpadModeSwitcher.modes) {
            if (LaunchpadModeSwitcher.modes.hasOwnProperty(mode)) {
                Launchpad.setPadColor(LaunchpadModeSwitcher.modes[mode].note, 0);
            }
        }
    },

    hide: function() {
        if (debug) println("Hiding third dummy page");
    },

    handlePadPress: function(padNote) {
        if (debug) println("Page 3 pad pressed: " + padNote);
        return false;  // Don't handle pads on this demo page
    },

    handlePadRelease: function(padNote) {
        return false;
    }
};

/**
 * Declarative gesture configuration for clip launcher
 * Fluent API for configuring click, hold, and modifier behaviors
 * @namespace
 */
var ClipGestures = {
    _clickFn: null,
    _holdFn: null,
    _modifiers: {},        // { cc: { name, color, click, hold } }
    _activeModifier: null, // Currently held modifier CC

    click: function(fn) {
        this._clickFn = fn;
        return this;
    },

    hold: function(fn) {
        this._holdFn = fn;
        return this;
    },

    modifier: function(cc, config) {
        this._modifiers[cc] = config;
        return this;
    },

    // Called by handleTopButtonCC
    handleModifierPress: function(cc) {
        var mod = this._modifiers[cc];
        if (mod) {
            this._activeModifier = cc;
            Launchpad.setTopButtonColor(cc, mod.color);
            return true;
        }
        return false;
    },

    handleModifierRelease: function(cc) {
        if (this._modifiers[cc]) {
            this._activeModifier = null;
            Launchpad.setTopButtonColor(cc, Launchpad.colors.off);
            // Reset any modifier-specific state
            var mod = this._modifiers[cc];
            if (mod.onRelease) mod.onRelease.call(ClipLauncher);
            return true;
        }
        return false;
    },

    // Called by pad click/hold
    executeClick: function(t, s, slot) {
        var fn = this._clickFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.click) fn = mod.click;
        }
        if (fn) fn.call(ClipLauncher, t, s, slot);
    },

    executeHold: function(t, s, slot) {
        var fn = this._holdFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.hold) fn = mod.hold;
        }
        if (fn) fn.call(ClipLauncher, t, s, slot);
    }
};

// Configure clip launcher gestures
ClipGestures
    .click(function(t, s, slot) {
        // Cancel recording if in progress
        if (slot.isRecording().get() || slot.isRecordingQueued().get()) {
            this._trackBank.getItemAt(t).stop();
            return;
        }
        // Launch if has content, otherwise record
        if (slot.hasContent().get()) {
            this.launchClip(t, s);
        } else {
            this.recordClip(t, s);
        }
    })
    .hold(function(t, s, slot) {
        this.deleteClip(t, s);
    })
    .modifier(Launchpad.buttons.top6, {
        name: 'duplicate',
        color: Launchpad.colors.green,
        click: function(t, s, slot) {
            this.handleDuplicateClick(t, s);
        },
        onRelease: function() {
            this.clearDuplicateSource();
        }
    });

/**
 * Clip launcher control for Bitwig session view
 * @namespace
 */
var ClipLauncher = {
    pageNumber: 2,  // Clip launcher lives on page 2
    _trackBank: null,
    _sceneBank: null,
    _numTracks: 7,   // Rows 1-7 for clips
    _numScenes: 8,   // Columns 1-8 for scenes
    _trackColors: [],  // Store track colors [{r, g, b}] per track
    _duplicateSource: null, // {trackIndex, sceneIndex} of source clip for duplicate gesture

    init: function() {
        // Create track bank: 7 tracks, 0 sends, 8 scenes
        this._trackBank = host.createMainTrackBank(this._numTracks, 0, this._numScenes);

        // Get scene bank for scene launching
        this._sceneBank = this._trackBank.sceneBank();

        // Initialize track colors array
        for (var t = 0; t < this._numTracks; t++) {
            this._trackColors[t] = { r: 0.5, g: 0.5, b: 0.5 };  // Default gray
        }

        // Set up observers for all clip slots and scenes
        this.setupClipObservers();
        this.setupSceneObservers();

        // Note: registerPadBehaviors is called from Page_ClipLauncher.show()

        if (debug) println("ClipLauncher initialized: " + this._numTracks + " tracks × " + this._numScenes + " scenes (Bitwig layout)");
    },

    setupClipObservers: function() {
        for (var t = 0; t < this._numTracks; t++) {
            for (var s = 0; s < this._numScenes; s++) {
                this.setupSlotObserver(t, s);
            }

            // Set up track color observer
            this.setupTrackColorObserver(t);
        }
    },

    setupSlotObserver: function(trackIndex, sceneIndex) {
        var self = this;
        (function(t, s) {
            var track = self._trackBank.getItemAt(t);
            var slot = track.clipLauncherSlotBank().getItemAt(s);

            // Mark all states as interested
            slot.hasContent().markInterested();
            slot.isPlaying().markInterested();
            slot.isRecording().markInterested();
            slot.isPlaybackQueued().markInterested();
            slot.isRecordingQueued().markInterested();
            slot.color().markInterested();

            // Add observers
            slot.hasContent().addValueObserver(function(has) {
                self.updateClipPad(t, s);
            });

            slot.isPlaying().addValueObserver(function(playing) {
                self.updateClipPad(t, s);
            });

            slot.isRecording().addValueObserver(function(recording) {
                self.updateClipPad(t, s);
            });

            slot.isPlaybackQueued().addValueObserver(function(queued) {
                self.updateClipPad(t, s);
            });

            slot.isRecordingQueued().addValueObserver(function(queued) {
                self.updateClipPad(t, s);
            });

            // Clip color change observer
            slot.color().addValueObserver(function(r, g, b) {
                self.updateClipPad(t, s);
            });

        })(trackIndex, sceneIndex);
    },

    setupTrackColorObserver: function(trackIndex) {
        var self = this;
        (function(t) {
            var track = self._trackBank.getItemAt(t);
            track.color().markInterested();
            track.color().addValueObserver(function(r, g, b) {
                self._trackColors[t] = { r: r, g: g, b: b };
                // Update all clips in this track
                for (var s = 0; s < self._numScenes; s++) {
                    self.updateClipPad(t, s);
                }
            });
        })(trackIndex);
    },

    setupSceneObservers: function() {
        var self = this;
        for (var s = 0; s < this._numScenes; s++) {
            (function(sceneIndex) {
                var scene = self._sceneBank.getItemAt(sceneIndex);
                scene.exists().markInterested();
                scene.exists().addValueObserver(function(exists) {
                    self.updateScenePad(sceneIndex);
                });
            })(s);
        }
    },

    updateClipPad: function(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);

        // Bitwig-style layout: tracks = rows, scenes = columns
        // Track 0 = row 7 (top clip row), Track 6 = row 1 (bottom)
        // Scene 0 = col 1, Scene 7 = col 8
        // Row 8 = scene launch buttons
        var row = 7 - trackIndex;
        var col = sceneIndex + 1;
        var padNote = row * 10 + col;

        var clipState = this.getClipState(slot, this._trackColors[trackIndex]);

        // Use appropriate LED mode based on state
        if (clipState.mode === 'flashing') {
            Pager.requestPaintFlashing(this.pageNumber, padNote, clipState.color);
        } else if (clipState.mode === 'pulsing') {
            Pager.requestPaintPulsing(this.pageNumber, padNote, clipState.color);
        } else {
            Pager.requestPaint(this.pageNumber, padNote, clipState.color);
        }

        // Also update the scene pad since clip state affects scene display
        this.updateScenePad(sceneIndex);
    },

    updateScenePad: function(sceneIndex) {
        // Scene launch buttons on row 8, columns 1-8
        var padNote = 80 + sceneIndex + 1;

        // Check if any clip is playing in this scene (column)
        var anyPlaying = false;
        var hasContent = false;

        for (var t = 0; t < this._numTracks; t++) {
            var track = this._trackBank.getItemAt(t);
            var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);
            if (slot.isPlaying().get()) {
                anyPlaying = true;
            }
            if (slot.hasContent().get()) {
                hasContent = true;
            }
        }

        // Green if playing, dim green if has content, off otherwise
        var color;
        if (anyPlaying) {
            color = Launchpad.colors.green;
        } else if (hasContent) {
            color = 21;  // Dim green
        } else {
            color = 0;  // Off
        }

        // Use Pager gatekeeper - only paints if page 2 is active
        Pager.requestPaint(this.pageNumber, padNote, color);
    },

    launchScene: function(sceneIndex) {
        var scene = this._sceneBank.getItemAt(sceneIndex);
        scene.launch();
        if (debug) println("Launching scene " + sceneIndex);
    },

    /**
     * Get clip state including color and LED mode
     * @returns {Object} {color: number, mode: 'static'|'flashing'|'pulsing'}
     */
    getClipState: function(slot, trackColor) {
        // Priority: recording queued > recording > playback queued > playing > has content > empty

        if (slot.isRecordingQueued().get()) {
            return { color: Launchpad.colors.red, mode: 'flashing' };
        }

        if (slot.isRecording().get()) {
            return { color: Launchpad.colors.red, mode: 'static' };
        }

        if (slot.isPlaybackQueued().get()) {
            var c = this.mixColor(trackColor, { r: 1, g: 1, b: 1 }, 0.7);
            return { color: this.rgbToLaunchpadColor(c.r, c.g, c.b), mode: 'flashing' };
        }

        if (slot.isPlaying().get()) {
            var c = this.mixColor(trackColor, { r: 1, g: 1, b: 1 }, 0.5);
            return { color: this.rgbToLaunchpadColor(c.r, c.g, c.b), mode: 'pulsing' };
        }

        if (slot.hasContent().get()) {
            return { color: this.rgbToLaunchpadColor(trackColor.r, trackColor.g, trackColor.b), mode: 'static' };
        }

        // Empty slot
        return { color: 0, mode: 'static' };
    },

    mixColor: function(c1, c2, ratio) {
        return {
            r: c1.r * (1 - ratio) + c2.r * ratio,
            g: c1.g * (1 - ratio) + c2.g * ratio,
            b: c1.b * (1 - ratio) + c2.b * ratio
        };
    },

    rgbToLaunchpadColor: function(r, g, b) {
        // Convert RGB (0-1) to closest Launchpad color
        // This is a simplified version - could be more sophisticated

        if (r < 0.1 && g < 0.1 && b < 0.1) return 0;  // Black/off

        // Determine dominant color
        var max = Math.max(r, g, b);
        var brightness = max > 0.7 ? 1 : 0.5;  // Bright or dim

        if (r > g && r > b) {
            // Red dominant
            return brightness > 0.7 ? Launchpad.colors.red : 1;
        } else if (g > r && g > b) {
            // Green dominant
            return brightness > 0.7 ? Launchpad.colors.green : 21;
        } else if (b > r && b > g) {
            // Blue dominant
            return brightness > 0.7 ? Launchpad.colors.blue : 41;
        } else if (r > 0.5 && g > 0.5 && b < 0.3) {
            // Yellow
            return brightness > 0.7 ? Launchpad.colors.yellow : 13;
        } else if (r > 0.5 && g < 0.3 && b > 0.5) {
            // Purple/Magenta
            return brightness > 0.7 ? Launchpad.colors.purple : 53;
        } else {
            // White/Gray
            return brightness > 0.7 ? 3 : 1;
        }
    },

    launchClip: function(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);
        slot.launch();

        if (debug) println("Launch clip: track " + trackIndex + ", scene " + sceneIndex);
    },

    recordClip: function(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);

        // XOR arm: disarm all other tracks first (exclusive arm)
        for (var t = 0; t < this._numTracks; t++) {
            if (t !== trackIndex) {
                this._trackBank.getItemAt(t).arm().set(false);
            }
        }

        // Arm the target track
        track.arm().set(true);

        slot.record();

        if (debug) println("Record clip: track " + trackIndex + ", scene " + sceneIndex);
    },

    deleteClip: function(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);
        slot.deleteObject();
        if (debug) println("Delete clip: track " + trackIndex + ", scene " + sceneIndex);
    },

    registerPadBehaviors: function() {
        var self = this;
        // Rows 1-7 = clip pads (7 tracks × 8 scenes)
        for (var trackIndex = 0; trackIndex < this._numTracks; trackIndex++) {
            for (var sceneIndex = 0; sceneIndex < this._numScenes; sceneIndex++) {
                (function(t, s) {
                    var row = 7 - t;
                    var col = s + 1;
                    var padNote = row * 10 + col;

                    Launchpad.registerPadBehavior(padNote,
                        // Click callback - delegates to ClipGestures
                        function() {
                            var track = self._trackBank.getItemAt(t);
                            var slot = track.clipLauncherSlotBank().getItemAt(s);
                            ClipGestures.executeClick(t, s, slot);
                        },
                        // Hold callback - delegates to ClipGestures
                        function() {
                            var track = self._trackBank.getItemAt(t);
                            var slot = track.clipLauncherSlotBank().getItemAt(s);
                            ClipGestures.executeHold(t, s, slot);
                        },
                        self.pageNumber  // Page 2 - clip launcher
                    );
                })(trackIndex, sceneIndex);
            }
        }
        if (debug) println("ClipLauncher pad behaviors registered");
    },

    stopTrack: function(trackIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        track.stop();

        if (debug) println("Stop track: " + trackIndex);
    },

    refresh: function() {
        // Refresh all clip pads
        for (var t = 0; t < this._numTracks; t++) {
            for (var s = 0; s < this._numScenes; s++) {
                this.updateClipPad(t, s);
            }
        }
        // Refresh scene launch pads (row 8)
        for (var s = 0; s < this._numScenes; s++) {
            this.updateScenePad(s);
        }
    },

    // Duplicate gesture handler (used by ClipGestures modifier)
    handleDuplicateClick: function(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);

        if (!this._duplicateSource) {
            // First click - select source (must have content)
            if (slot.hasContent().get()) {
                this._duplicateSource = { trackIndex: trackIndex, sceneIndex: sceneIndex };
                // Highlight source pad pink
                var padNote = (7 - trackIndex) * 10 + (sceneIndex + 1);
                Pager.requestPaint(this.pageNumber, padNote, Launchpad.colors.pink);
                if (debug) println("Duplicate source: track " + trackIndex + ", scene " + sceneIndex);
            }
        } else {
            // Second click - select destination and copy
            this.duplicateClip(
                this._duplicateSource.trackIndex,
                this._duplicateSource.sceneIndex,
                trackIndex,
                sceneIndex
            );
            this.clearDuplicateSource();
        }
    },

    clearDuplicateSource: function() {
        if (this._duplicateSource) {
            // Restore original color by triggering update
            this.updateClipPad(this._duplicateSource.trackIndex, this._duplicateSource.sceneIndex);
        }
        this._duplicateSource = null;
    },

    duplicateClip: function(srcTrack, srcScene, dstTrack, dstScene) {
        var srcSlot = this._trackBank.getItemAt(srcTrack).clipLauncherSlotBank().getItemAt(srcScene);
        var dstSlot = this._trackBank.getItemAt(dstTrack).clipLauncherSlotBank().getItemAt(dstScene);
        dstSlot.copyFrom(srcSlot);
        if (debug) println("Duplicated clip from (" + srcTrack + "," + srcScene + ") to (" + dstTrack + "," + dstScene + ")");
    }
};

/**
 * @typedef {Object} TwisterColor
 * @property {number} idx - MIDI color index
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

/**
 * MIDI Fighter Twister hardware abstraction
 * @namespace
 */
var Twister = {
    // MIDI Fighter Twister color palette (approximate indices)
    colors: [
    {idx: 0,   r: 0,   g: 0,   b: 0},      // Black/Off
    {idx: 1,   r: 40,  g: 40,  b: 40},     // Dark gray
    {idx: 5,   r: 0,   g: 0,   b: 200},    // Blue
    {idx: 7,   r: 0,   g: 150, b: 255},    // Light blue
    {idx: 9,   r: 0,   g: 200, b: 200},    // Cyan
    {idx: 11,  r: 0,   g: 255, b: 150},    // Cyan-green
    {idx: 13,  r: 0,   g: 255, b: 0},      // Green
    {idx: 15,  r: 150, g: 255, b: 0},      // Lime
    {idx: 17,  r: 255, g: 255, b: 0},      // Yellow
    {idx: 19,  r: 255, g: 180, b: 0},      // Gold
    {idx: 21,  r: 255, g: 100, b: 0},      // Orange
    {idx: 23,  r: 255, g: 50,  b: 0},      // Red-orange
    {idx: 25,  r: 255, g: 0,   b: 0},      // Red
    {idx: 27,  r: 255, g: 0,   b: 100},    // Pink-red
    {idx: 29,  r: 255, g: 0,   b: 200},    // Pink
    {idx: 31,  r: 255, g: 0,   b: 255},    // Magenta
    {idx: 33,  r: 200, g: 0,   b: 255},    // Purple-magenta
    {idx: 35,  r: 150, g: 0,   b: 255},    // Purple
    {idx: 37,  r: 100, g: 0,   b: 200}     // Dark purple
    ],

    /**
     * Internal reference to MIDI output
     * @private
     */
    _output: null,

    /**
     * Encoder-to-track links
     * @private
     */
    _encoderLinks: {},

    /**
     * Track-to-encoder reverse mapping
     * @private
     */
    _trackToEncoder: {},

    /**
     * Track ID when in send mode (null = normal mode)
     * @private
     */
    _sendModeTrackId: null,

    /**
     * Encoder-to-send links: encoderNum -> {trackId, sendIndex, send}
     * @private
     */
    _sendLinks: {},

    /**
     * Reverse mapping: "trackId_sendIndex" -> encoderNum
     * @private
     */
    _sendToEncoder: {},

    /**
     * Effect track index -> encoderNum for FX volume links
     * @private
     */
    _effectTrackToEncoder: {},

    /**
     * Encoder-to-behavior links for custom behaviors (not track-linked)
     * @private
     */
    _encoderBehaviors: {},

    /**
     * Encoder used for tempo control in top-level group
     */
    TEMPO_ENCODER: 4,

    /**
     * Tempo range for encoder mapping (BPM)
     */
    TEMPO_MIN: 60,
    TEMPO_MAX: 230,

    /**
     * Initialize Twister hardware
     * @param {Object} midiOutput - MIDI output port
     */
    init: function(midiOutput) {
        this._output = midiOutput;
        if (debug) println("Twister initialized: " + (midiOutput ? "Connected" : "NULL"));
    },

    /**
     * Convert encoder number (1-16) to CC number (0-15)
     * @param {number} encoderNumber - Encoder number (1-16, bottom-left origin)
     * @returns {number} CC number (0-15)
     */
    encoderToCC: function(encoderNumber) {
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return 0;
        }

        // Convert 1-based encoder to 0-based
        var encoder0 = encoderNumber - 1;

        // Calculate row and column (bottom-left = encoder 1)
        var row = Math.floor(encoder0 / 4);  // 0-3, where 0 is bottom
        var col = encoder0 % 4;               // 0-3, left to right

        // Flip vertically (CC numbering starts at top)
        var flippedRow = 3 - row;

        // Calculate CC number
        var cc = flippedRow * 4 + col;

        return cc;
    },

    /**
     * Convert CC number (0-15) to encoder number (1-16)
     * @param {number} cc - CC number (0-15)
     * @returns {number} Encoder number (1-16, bottom-left origin)
     */
    ccToEncoder: function(cc) {
        // CC numbering starts at top-left, goes left-to-right, top-to-bottom
        var row = Math.floor(cc / 4);      // 0-3, where 0 is top
        var col = cc % 4;                   // 0-3, left to right

        // Flip vertically (encoder numbering starts at bottom)
        var originalRow = 3 - row;

        // Calculate encoder number (1-16, bottom-left origin)
        var encoder0 = originalRow * 4 + col;
        var encoderNumber = encoder0 + 1;

        return encoderNumber;
    },

    /**
     * Set encoder LED ring value
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} value - LED ring value (0-127)
     */
    setEncoderLED: function(encoderNumber, value) {
        if (!this._output) {
            if (debug) println("Warning: Twister not initialized");
            return;
        }

        var cc = this.encoderToCC(encoderNumber);
        // Send CC on channel 0 to update encoder LED ring
        this._output.sendMidi(0xB0, cc, value);
    },

    /**
     * Set encoder RGB color
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} red - Red component (0-255)
     * @param {number} green - Green component (0-255)
     * @param {number} blue - Blue component (0-255)
     */
    setEncoderColor: function(encoderNumber, red, green, blue) {
        if (!this._output) {
            if (debug) println("Warning: Twister not initialized");
            return;
        }

        var cc = this.encoderToCC(encoderNumber);
        var colorIndex = this.findClosestColorIndex(red, green, blue);

        // Send color index on channel 2 (RGB indicator channel)
        this._output.sendMidi(0xB1, cc, colorIndex);
    },

    /**
     * Clear encoder LED and color
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    clearEncoder: function(encoderNumber) {
        this.setEncoderLED(encoderNumber, 0);
        this.setEncoderColor(encoderNumber, 0, 0, 0);
    },

    /**
     * Clear all encoders (visual only)
     */
    clearAll: function() {
        for (var i = 1; i <= 16; i++) {
            this.clearEncoder(i);
        }
        if (debug) println("All Twister encoders cleared");
    },

    /**
     * Unlink all encoders from their tracks and behaviors
     */
    unlinkAll: function() {
        for (var i = 1; i <= 16; i++) {
            this.unlinkEncoder(i);
        }
        // Reset send mode state
        this._sendModeTrackId = null;
    },

    /**
     * Refresh encoder LEDs for volume mode
     */
    refreshEncoderLEDsForVolume: function() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var volumeValue = link.track.volume().get();
                var midiValue = Math.round(volumeValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    },

    /**
     * Refresh encoder LEDs for pan mode
     */
    refreshEncoderLEDsForPan: function() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var panValue = link.track.pan().get();
                var midiValue = Math.round(panValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    },

    /**
     * Link an encoder to a track for bi-directional control
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} trackId - Track ID in bank (0-63)
     */
    linkEncoderToTrack: function(encoderNumber, trackId) {
        var self = this;

        // Validate encoder number
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }

        // Get the track
        var track = Bitwig.getTrack(trackId);
        if (!track) {
            if (debug) println("Warning: Track " + trackId + " not found");
            return;
        }

        // Clean up any existing link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store the link
        this._encoderLinks[encoderNumber] = {
            trackId: trackId,
            track: track,
            trackName: track.name().get()
        };

        // Store reverse mapping
        this._trackToEncoder[trackId] = encoderNumber;

        // Initial sync (observers are set up globally in init())
        var volumeValue = track.volume().get();
        var midiValue = Math.round(volumeValue * 127);
        this.setEncoderLED(encoderNumber, midiValue);

        var color = track.color();
        var red = Math.round(color.red() * 255);
        var green = Math.round(color.green() * 255);
        var blue = Math.round(color.blue() * 255);
        this.setEncoderColor(encoderNumber, red, green, blue);

    },

    /**
     * Link an encoder to a track's send (for Send A mode)
     * @param {number} encoderNumber - Encoder number (1-8 for sends)
     * @param {number} trackId - Source track ID
     * @param {number} sendIndex - Send index (0-7)
     * @param {Object} fxTrack - FX track object for color
     */
    linkEncoderToSend: function(encoderNumber, trackId, sendIndex, fxTrack) {
        if (encoderNumber < 1 || encoderNumber > 8) {
            if (debug) println("Warning: linkEncoderToSend only supports encoders 1-8");
            return;
        }

        var track = Bitwig.getTrack(trackId);
        if (!track) {
            if (debug) println("Warning: Track " + trackId + " not found");
            return;
        }

        var send = track.sendBank().getItemAt(sendIndex);
        if (!send) {
            if (debug) println("Warning: Send " + sendIndex + " not found");
            return;
        }

        // Clean up any existing link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store send link
        this._sendLinks[encoderNumber] = {
            trackId: trackId,
            sendIndex: sendIndex,
            send: send
        };

        // Reverse mapping for observer
        var key = trackId + '_' + sendIndex;
        this._sendToEncoder[key] = encoderNumber;

        // Initial LED sync
        var value = send.value().get();
        this.setEncoderLED(encoderNumber, Math.round(value * 127));

        // Set color from FX track
        if (fxTrack) {
            var color = fxTrack.color();
            this.setEncoderColor(encoderNumber,
                Math.round(color.red() * 255),
                Math.round(color.green() * 255),
                Math.round(color.blue() * 255));
        }

        if (debug) println("Linked encoder " + encoderNumber + " to track " + trackId + " send " + sendIndex);
    },

    /**
     * Link an encoder to an effect track's volume (for Send A mode top row)
     * @param {number} encoderNumber - Encoder number (9-16 for FX volumes)
     * @param {number} effectIndex - Index in effect track bank (0-7)
     * @param {Object} track - Effect track object
     */
    linkEncoderToEffectTrack: function(encoderNumber, effectIndex, track) {
        if (encoderNumber < 9 || encoderNumber > 16) {
            if (debug) println("Warning: linkEncoderToEffectTrack only supports encoders 9-16");
            return;
        }

        if (!track) {
            if (debug) println("Warning: Effect track not provided");
            return;
        }

        this.unlinkEncoder(encoderNumber);

        // Store mapping for observer
        this._effectTrackToEncoder[effectIndex] = encoderNumber;

        // Store link info
        this._encoderLinks[encoderNumber] = {
            effectIndex: effectIndex,
            track: track,
            isEffectTrack: true
        };

        // Initial LED sync
        var volumeValue = track.volume().get();
        this.setEncoderLED(encoderNumber, Math.round(volumeValue * 127));

        // Set color
        var color = track.color();
        this.setEncoderColor(encoderNumber,
            Math.round(color.red() * 255),
            Math.round(color.green() * 255),
            Math.round(color.blue() * 255));

        if (debug) println("Linked encoder " + encoderNumber + " to effect track " + effectIndex);
    },

    /**
     * Link all encoders to a track's sends and FX volumes (Send A mode)
     * Bottom 8 encoders: sends from track to FX [1]-[8]
     * Top 8 encoders: FX track volumes
     * @param {number} trackId - Track ID to link sends from
     */
    linkEncodersToTrackSends: function(trackId) {
        this.unlinkAll();
        this._sendModeTrackId = trackId;

        var fxTracks = Bitwig.getFxTracks();

        // Bottom 8 encoders: sends from track to FX [1]-[8]
        // Send index is based on FX track order (i), encoder position from [N] naming
        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;  // [N] from track name -> encoder position
            var sendIndex = i;                // Send index based on FX track order
            this.linkEncoderToSend(fxNum, trackId, sendIndex, fxTracks[i].track);
        }

        // Top 8 encoders: FX track volumes (effect tracks)
        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;
            var effectIndex = fxTracks[i].index;
            var fxTrack = fxTracks[i].track;
            // Link encoder (8 + fxNum) to effect track volume
            this.linkEncoderToEffectTrack(8 + fxNum, effectIndex, fxTrack);
        }

        if (debug) println("Send mode activated for track " + trackId + " with " + fxTracks.length + " FX tracks");
    },

    /**
     * Link an encoder to custom behavior callbacks
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {Function} turnCallback - Called on encoder turn with value (0-127)
     * @param {Function} pressCallback - Called on encoder press with pressed state (boolean)
     * @param {Object} color - RGB color {r, g, b} (0-255 each)
     */
    linkEncoderToBehavior: function(encoderNumber, turnCallback, pressCallback, color) {
        // Validate encoder number
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }

        // Clear any existing track link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store the behavior
        this._encoderBehaviors[encoderNumber] = {
            turnCallback: turnCallback,
            pressCallback: pressCallback
        };

        // Set encoder color
        if (color) {
            this.setEncoderColor(encoderNumber, color.r, color.g, color.b);
        }

        if (debug) println("Linked encoder " + encoderNumber + " to custom behavior");
    },

    /**
     * Unlink an encoder from its track or behavior
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    unlinkEncoder: function(encoderNumber) {
        // Clear track link if exists (check for effect track first)
        if (this._encoderLinks[encoderNumber]) {
            var link = this._encoderLinks[encoderNumber];

            if (link.isEffectTrack) {
                // Effect track link - clean up effect track mapping
                delete this._effectTrackToEncoder[link.effectIndex];
            } else if (link.trackId !== undefined) {
                // Regular track link
                delete this._trackToEncoder[link.trackId];
            }

            delete this._encoderLinks[encoderNumber];
        }

        // Clear send link if exists
        if (this._sendLinks[encoderNumber]) {
            var sendLink = this._sendLinks[encoderNumber];
            var key = sendLink.trackId + '_' + sendLink.sendIndex;
            delete this._sendToEncoder[key];
            delete this._sendLinks[encoderNumber];
        }

        // Clear behavior link if exists
        if (this._encoderBehaviors[encoderNumber]) {
            delete this._encoderBehaviors[encoderNumber];
        }

        // Clear encoder display
        this.clearEncoder(encoderNumber);
    },

    /**
     * Get the track linked to an encoder
     * @param {number} encoderNumber - Encoder number (1-16)
     * @returns {Object|null} Track object or null
     */
    getLinkedTrack: function(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        return link ? link.track : null;
    },

    /**
     * Handle encoder rotation (called by Controller)
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} value - MIDI value (0-127)
     */
    handleEncoderTurn: function(encoderNumber, value) {
        // Check for custom behavior first
        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.turnCallback) {
            behavior.turnCallback(value);
            return;
        }

        // Check for send mode (encoders 1-8)
        var sendLink = this._sendLinks[encoderNumber];
        if (sendLink && LaunchpadModeSwitcher.currentMode === LaunchpadModeSwitcher.modeEnum.SEND_A) {
            sendLink.send.value().set(value / 127.0);
            return;
        }

        // Check for effect track link (encoders 9-16 in send mode)
        var link = this._encoderLinks[encoderNumber];
        if (link && link.isEffectTrack) {
            link.track.volume().set(value / 127.0);
            return;
        }

        // Fall through to regular track handling
        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            var normalizedValue = value / 127.0;

            // Check current mode
            if (LaunchpadModeSwitcher.currentMode === LaunchpadModeSwitcher.modeEnum.PAN) {
                track.pan().set(normalizedValue);
            } else {
                // Default: volume mode
                track.volume().set(normalizedValue);
            }
        }
    },

    /**
     * Handle encoder button press (called by Controller)
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {boolean} pressed - True if pressed, false if released
     */
    handleEncoderPress: function(encoderNumber, pressed) {
        // Check for custom behavior first
        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.pressCallback) {
            behavior.pressCallback(pressed);
            return;
        }

        // Fall through to track handling
        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            track.solo().set(pressed);
        }
    },

    /**
     * Find closest color index in palette
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {number} Color index (0-127)
     * @private
     */
    findClosestColorIndex: function(r, g, b) {
        var hue = this._rgbToHue(r, g, b);
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var saturation = (max === 0) ? 0 : (max - min) / max;

        // Log color info for debugging
        if (debug) {
            println("Color: RGB(" + r + ", " + g + ", " + b +
                    ") Hue: " + hue.toFixed(1) +
                    "° Sat: " + saturation.toFixed(2) +
                    " Bright: " + max);
        }

        // Special case: Grayscale colors (low saturation)
        if (saturation < 0.15) {
            if (debug) println("  -> Grayscale detected");
            return 0;
        }

        // Special case: Purple colors (hue 270-330°)
        if (hue >= 270 && hue <= 330) {
            if (debug) println("  -> Purple detected, hue: " + hue.toFixed(1));
            var purpleRange = hue - 270;  // 0-60
            var colorIndex = Math.round(105 + (purpleRange * 15 / 60));
            if (debug) println("  -> Purple mapped to index: " + colorIndex);
            return colorIndex;
        }

        // Map hue (0-360) to color index (0-127)
        // MF Twister uses inverted hue + 240° rotation
        var invertedHue = 360 - hue;
        var adjustedHue = (invertedHue + 240) % 360;
        var colorIndex = Math.round(adjustedHue * 127 / 360);

        if (debug) println("  -> Index: " + colorIndex);
        return colorIndex;
    },

    /**
     * Convert RGB to hue angle
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {number} Hue angle (0-360)
     * @private
     */
    _rgbToHue: function(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;

        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var delta = max - min;

        if (delta === 0) {
            return 0; // Gray/black/white - no hue
        }

        var hue;
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max === g) {
            hue = 60 * (((b - r) / delta) + 2);
        } else {
            hue = 60 * (((r - g) / delta) + 4);
        }

        if (hue < 0) {
            hue += 360;
        }

        return hue;
    }
};

/**
 * Controller business logic
 * @namespace
 */
var Controller = {
    /**
     * Currently selected group (1-16, where 16 = top-level)
     * @private
     */
    selectedGroup: null,

    /**
     * Initialize controller
     */
    init: function() {
        // Register mode button behaviors
        this.registerModeButtonBehaviors();

        // Auto-select group 16 (top-level tracks)
        this.selectGroup(16);
        if (debug) println("Controller initialized");
    },

    /**
     * Register click and hold behaviors for mode buttons
     */
    registerModeButtonBehaviors: function() {
        var self = this;
        var modeEnum = LaunchpadModeSwitcher.modeEnum;
        var modes = LaunchpadModeSwitcher.modes;

        var page = Page_MainControl.pageNumber;

        // Mute mode button
        Launchpad.registerPadBehavior(modes.mute.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.MUTE);
        }, function() {
            self.clearAllMute();
        }, page);

        // Solo mode button
        Launchpad.registerPadBehavior(modes.solo.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.SOLO);
        }, function() {
            self.clearAllSolo();
        }, page);

        // Record arm mode button
        Launchpad.registerPadBehavior(modes.recordArm.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.RECORD_ARM);
        }, function() {
            self.clearAllArm();
        }, page);

        // Other mode buttons (no hold behavior)
        Launchpad.registerPadBehavior(modes.volume.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.VOLUME);
        }, null, page);

        Launchpad.registerPadBehavior(modes.pan.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.PAN);
        }, null, page);

        Launchpad.registerPadBehavior(modes.sendA.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.SEND_A);
        }, null, page);

        Launchpad.registerPadBehavior(modes.sendB.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.SEND_B);
        }, null, page);

        Launchpad.registerPadBehavior(modes.stop.note, function() {
            LaunchpadModeSwitcher.selectMode(modeEnum.STOP);
        }, null, page);
    },

    /**
     * Select a group and link encoders to its children
     * @param {number} groupNumber - Group number (1-16, where 16 = top-level)
     */
    selectGroup: function(groupNumber) {
        // Validate group number
        if (groupNumber < 1 || groupNumber > 16) {
            return;
        }

        // Clear all encoder links
        Twister.unlinkAll();

        if (groupNumber === 16) {
            // Top-level: link encoders 1-15 to depth-0 tracks
            // Encoder 16 remains unlinked
            host.showPopupNotification("Top Level");
            var topTracks = Bitwig.getTopLevelTracks();

            for (var i = 0; i < topTracks.length; i++) {
                var trackId = topTracks[i];
                var track = Bitwig.getTrack(trackId);

                if (track) {
                    var name = track.name().get();

                    // Parse for (x) notation (only 1-15, skip tempo encoder)
                    var match = name.match(/\((\d+)\)/);
                    if (match) {
                        var encoderNum = parseInt(match[1]);
                        if (encoderNum >= 1 && encoderNum <= 15 && encoderNum !== Twister.TEMPO_ENCODER) {
                            Twister.linkEncoderToTrack(encoderNum, trackId);
                        }
                    }
                }
            }

            // Link tempo encoder
            Twister.linkEncoderToBehavior(Twister.TEMPO_ENCODER,
                function(value) {
                    var tempo = Bitwig.getTransport().tempo();
                    // Map 0-127 to TEMPO_MIN-TEMPO_MAX BPM, rounded to integer
                    var bpm = Math.round(Twister.TEMPO_MIN + (value / 127.0) * (Twister.TEMPO_MAX - Twister.TEMPO_MIN));
                    tempo.setRaw(bpm);
                },
                null,  // no press behavior
                { r: 255, g: 255, b: 255 }  // white color for tempo
            );

            // Initial LED sync to current tempo
            var tempo = Bitwig.getTransport().tempo();
            var currentBpm = tempo.getRaw();
            var ledValue = Math.round((currentBpm - Twister.TEMPO_MIN) / (Twister.TEMPO_MAX - Twister.TEMPO_MIN) * 127);
            ledValue = Math.max(0, Math.min(127, ledValue));
            Twister.setEncoderLED(Twister.TEMPO_ENCODER, ledValue);
        } else {
            // Find group by number (any depth)
            var groupTrackId = Bitwig.findGroupByNumber(groupNumber);

            if (groupTrackId !== null) {
                // Show group name notification
                var groupTrack = Bitwig.getTrack(groupTrackId);
                if (groupTrack) {
                    host.showPopupNotification(groupTrack.name().get());
                }

                // Get children of this group
                var children = Bitwig.getGroupChildren(groupTrackId);

                // Link encoders 1-15 to children with (1)-(15) notation
                for (var i = 0; i < children.length; i++) {
                    var trackId = children[i];
                    var track = Bitwig.getTrack(trackId);

                    if (track) {
                        var name = track.name().get();

                        // Parse for (x) notation (only 1-15)
                        var match = name.match(/\((\d+)\)/);
                        if (match) {
                            var encoderNum = parseInt(match[1]);
                            if (encoderNum >= 1 && encoderNum <= 15) {
                                Twister.linkEncoderToTrack(encoderNum, trackId);
                            }
                        }
                    }
                }

                // Link encoder 16 to the group track itself
                Twister.linkEncoderToTrack(16, groupTrackId);
            }
        }

        // Update selected group
        this.selectedGroup = groupNumber;

        // Refresh group display
        this.refreshGroupDisplay();

        // Refresh track grid
        this.refreshTrackGrid();
    },

    /**
     * Refresh the group selector display on Launchpad
     */
    refreshGroupDisplay: function() {
        var page = Pager.getActivePage();

        // Unlink all pads first
        Launchpad.unlinkAllPads();

        // Link all available groups to their pads (groups 1-15)
        for (var i = 1; i <= 15; i++) {
            var groupTrackId = Bitwig.findGroupByNumber(i);
            if (groupTrackId !== null) {
                var padNote = LaunchpadQuadrant.bottomRight.pads[i - 1];
                Launchpad.linkPadToTrack(padNote, groupTrackId, page);
            }
        }

        // Handle pad 16 (top-level group) - use white color
        var pad16 = LaunchpadQuadrant.bottomRight.pads[15];  // Index 15 = pad 16
        if (this.selectedGroup === 16) {
            Pager.requestPaint(page, pad16, Launchpad.getBrightnessVariant(Launchpad.colors.white, Launchpad.brightness.bright));
        } else {
            Pager.requestPaint(page, pad16, Launchpad.getBrightnessVariant(Launchpad.colors.white, Launchpad.brightness.dim));
        }

        // Highlight selected group with bright color variant (groups 1-15)
        if (this.selectedGroup && this.selectedGroup <= 15) {
            var selectedPad = LaunchpadQuadrant.bottomRight.pads[this.selectedGroup - 1];
            var groupTrackId = Bitwig.findGroupByNumber(this.selectedGroup);

            if (groupTrackId !== null) {
                var track = Bitwig.getTrack(groupTrackId);
                if (track) {
                    var color = track.color();
                    var launchpadColor = Launchpad.bitwigColorToLaunchpad(
                        color.red(),
                        color.green(),
                        color.blue()
                    );
                    var brightColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.bright);
                    Pager.requestPaint(page, selectedPad, brightColor);
                }
            }
        }
    },

    /**
     * Refresh the track grid display on Launchpad
     */
    refreshTrackGrid: function() {
        var self = this;
        var page = Pager.getActivePage();

        // Unlink all track grid pads
        for (var i = 0; i < LaunchpadQuadrant.bottomLeft.pads.length; i++) {
            Launchpad.unlinkPad(LaunchpadQuadrant.bottomLeft.pads[i]);
        }

        // Link pads based on encoder links
        var currentMode = LaunchpadModeSwitcher.currentMode;
        var modeEnum = LaunchpadModeSwitcher.modeEnum;

        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = Twister._encoderLinks[encoderNum];
            if (link) {
                var padNote = LaunchpadQuadrant.bottomLeft.pads[encoderNum - 1];
                var trackId = link.trackId;

                Launchpad.linkPadToTrack(padNote, trackId, page);

                // Register click behaviors based on current mode (no hold behaviors on track pads)
                if (currentMode === modeEnum.MUTE) {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                track.mute().toggle();
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (currentMode === modeEnum.SOLO) {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                track.solo().toggle();
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (currentMode === modeEnum.RECORD_ARM) {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                // XOR arm: disarm all other tracks first
                                for (var t = 0; t < 64; t++) {
                                    var otherTrack = Bitwig.getTrack(t);
                                    if (otherTrack && t !== tid) {
                                        otherTrack.arm().set(false);
                                    }
                                }
                                track.arm().set(true);
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (currentMode === modeEnum.SEND_A) {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get() + " → Sends");
                                Twister.linkEncodersToTrackSends(tid);
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                }
            }
        }
    },

    /**
     * Handle track name changes for automatic re-linking
     * @param {number} trackId - Track ID (0-63)
     * @param {string} newName - New track name
     */
    handleTrackNameChange: function(trackId, newName) {
        // Only handle tracks within the currently selected group
        if (!this.selectedGroup) {
            return;
        }

        // Check if this track is in the selected group
        var isInGroup = false;

        if (this.selectedGroup === 16) {
            // Check if track is top-level
            isInGroup = Bitwig._trackDepths[trackId] === 0;
        } else {
            // Check if track is a child of the selected group
            var groupTrackId = Bitwig.findGroupByNumber(this.selectedGroup);
            if (groupTrackId !== null) {
                var children = Bitwig.getGroupChildren(groupTrackId);
                isInGroup = children.indexOf(trackId) !== -1;
            }
        }

        if (!isInGroup) {
            return; // Track not in selected group
        }

        // Parse the new name for encoder numbers
        var encoderMatch = newName.match(/\((\d+)\)/);

        // Find if this track was previously linked to any encoder
        var previousEncoder = Twister._trackToEncoder[trackId];

        if (encoderMatch) {
            var newEncoder = parseInt(encoderMatch[1]);

            if (newEncoder >= 1 && newEncoder <= 16) {
                // Check if another track is using this encoder
                var existingLink = Twister._encoderLinks[newEncoder];
                if (existingLink && existingLink.trackId !== trackId) {
                    // Another track has this encoder - unlink it
                    Twister.unlinkEncoder(newEncoder);
                }

                // Unlink from previous encoder if different
                if (previousEncoder && previousEncoder !== newEncoder) {
                    Twister.unlinkEncoder(previousEncoder);
                }

                // Link to new encoder
                Twister.linkEncoderToTrack(newEncoder, trackId);
            } else if (previousEncoder) {
                // Invalid encoder number - unlink if previously linked
                Twister.unlinkEncoder(previousEncoder);
            }
        } else {
            // No encoder number in name - unlink if previously linked
            if (previousEncoder) {
                Twister.unlinkEncoder(previousEncoder);
            }
        }
    },

    /**
     * Sync encoder to its mapped track (using naming convention)
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    syncEncoderToTrack: function(encoderNumber) {
        // Find track with "(n)" in name where n = encoderNumber
        var searchString = "(" + encoderNumber + ")";

        // Search through all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.name().get().indexOf(searchString) !== -1) {
                // Link this encoder to the track
                Twister.linkEncoderToTrack(encoderNumber, i);
                return;
            }
        }

        // No track found - unlink the encoder
        Twister.unlinkEncoder(encoderNumber);
    },

    /**
     * Sync all encoders to their mapped tracks
     */
    syncAllEncoders: function() {
        if (debug) println("Syncing all encoder LEDs...");
        for (var i = 1; i <= 16; i++) {
            this.syncEncoderToTrack(i);
        }
    },

    /**
     * Clear all muted tracks with flash animation
     */
    clearAllMute: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.mute;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear mute on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.mute().get()) {
                track.mute().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Clear all soloed tracks with flash animation
     */
    clearAllSolo: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.solo;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear solo on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.solo().get()) {
                track.solo().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Prepare for recording at a marker position
     * @param {number} markerIndex - Marker index (0-15)
     */
    prepareRecordingAtMarker: function(markerIndex) {
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        var marker = markerBank.getItemAt(markerIndex);
        if (!marker || !marker.exists().get()) return;

        // Get current marker position
        var startPos = marker.position().get();

        // Find next marker position
        var endPos = startPos + 4.0;  // Default to 4 bars if no next marker
        for (var i = markerIndex + 1; i < 16; i++) {
            var nextMarker = markerBank.getItemAt(i);
            if (nextMarker && nextMarker.exists().get()) {
                endPos = nextMarker.position().get();
                break;
            }
        }

        if (debug) {
            println("Preparing recording: marker " + markerIndex);
            println("  Start: " + startPos + " beats");
            println("  End: " + endPos + " beats");
        }

        // Set time selection (loop range)
        Bitwig.setTimeSelection(startPos, endPos);

        // Move playhead to start
        Bitwig.setPlayheadPosition(startPos);

        // Enable arrangement record (NOT!)
        // Bitwig.setArrangementRecord(true);

        if (debug) println("Recording prepared at marker " + markerIndex);
    },

    /**
     * Clear all armed tracks with flash animation
     */
    clearAllArm: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.recordArm;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear record arm on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.arm().get()) {
                track.arm().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Handle Launchpad MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte
     * @param {number} data2 - MIDI data2 byte
     */
    onLaunchpadMidi: function(status, data1, data2) {
        // Handle CC messages (top buttons) - work on all pages
        if (status === 0xB0) {
            if (LaunchpadTopButtons.handleTopButtonCC(data1, data2)) {
                return;
            }
        }

        // Delegate pad press to current page
        if (status === 0x90 && data2 > 0) {
            if (Pages.handlePadPress(data1)) {
                return;
            }
        }

        // Delegate pad release to current page
        if ((status === 0x90 && data2 === 0) || status === 0x80) {
            Pages.handlePadRelease(data1);
        }
    },

    /**
     * Handle Twister MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte (CC number)
     * @param {number} data2 - MIDI data2 byte (value)
     */
    onTwisterMidi: function(status, data1, data2) {
        // Convert CC number to encoder number (1-16)
        var encoderNumber = Twister.ccToEncoder(data1);

        // Handle encoder turn (CC on channel 0, status 0xB0)
        if (status === 0xB0) {
            Twister.handleEncoderTurn(encoderNumber, data2);
        }

        // Handle button press (CC on channel 1, status 0xB1)
        if (status === 0xB1) {
            var pressed = data2 > 0;
            Twister.handleEncoderPress(encoderNumber, pressed);
        }
    },

    /**
     * Clean up on exit
     */
    exit: function() {
        // Clear hardware
        Twister.clearAll();
        Launchpad.clearAll();
        Launchpad.exitProgrammerMode();
    }
};

// ============================================================================
// Global Variables (to be refactored)
// ============================================================================

var launchpadOut;
var twisterOut;

// Bitwig API objects
var trackBank;
var trackDepths = []; // Store track depths detected during init

function calculateTrackDepths() {
    // Calculate depths based on naming convention:
    // - "top xxx" groups are depth 0
    // - Tracks after "top" group are depth 1
    // - Tracks after a depth-1 group are depth 2

    var depths = [];
    var currentTopGroup = -1;  // Index of current top-level group
    var currentChildGroup = -1;  // Index of current child group

    for (var i = 0; i < 64; i++) {
        var track = Bitwig.getTrack(i);
        if (!track) {
            depths[i] = 0;
            continue;
        }

        var trackName = track.name().get();
        var isGroup = track.isGroup().get();

        // Check if this is a top-level group
        if (trackName && trackName.toLowerCase().indexOf("top ") === 0) {
            depths[i] = 0;
            currentTopGroup = i;
            currentChildGroup = -1;  // Reset child group
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (top group)");
        }
        // Check if this is a child group (depth 1 group)
        else if (isGroup && currentTopGroup >= 0) {
            depths[i] = 1;
            currentChildGroup = i;
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (child group)");
        }
        // Regular track - determine depth based on parent groups
        else {
            if (currentChildGroup >= 0) {
                // We're inside a child group
                depths[i] = 2;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 2 (inside child group)");
            } else if (currentTopGroup >= 0) {
                // We're inside a top group but not a child group
                depths[i] = 1;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (inside top group)");
            } else {
                // No parent group
                depths[i] = 0;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (no parent)");
            }
        }
    }

    // Store depths in Bitwig namespace
    Bitwig.setTrackDepths(depths);
}


function printTrack(track, indent) {
    // Print track with indentation
    var indentStr = "";
    for (var i = 0; i < indent; i++) {
        indentStr += "  ";
    }

    var line = indentStr + "[" + track.id + "] " + track.name;
    if (track.isGroup) {
        line += " (GROUP)";
    }
    line += " - depth = " + track.depth;

    if (debug) println(line);

    // Recursively print children
    for (var j = 0; j < track.children.length; j++) {
        printTrack(track.children[j], indent + 1);
    }
}

function printTrackTree(tree) {
    if (debug) {
        println("=== TRACK TREE ===");

        for (var i = 0; i < tree.length; i++) {
            printTrack(tree[i], 0);
        }

        println("=== END TREE ===");
    }
}

function init() {
    transport = host.createTransport();

    // Launchpad on port 0
    launchpadOut = host.getMidiOutPort(0);
    Launchpad.init(launchpadOut);

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        printMidi(status, data1, data2);
        Controller.onLaunchpadMidi(status, data1, data2);
    });
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // MIDI Fighter Twister on port 1
    twisterOut = host.getMidiOutPort(1);
    Twister.init(twisterOut);

    host.getMidiInPort(1).setMidiCallback(function(status, data1, data2) {
        Controller.onTwisterMidi(status, data1, data2);
    });

    // Create main track bank to access all tracks (flat list including nested tracks)
    // 64 tracks, 8 sends (for FX routing), 0 scenes
    trackBank = host.createMainTrackBank(64, 8, 0);

    // Create effect track bank to access FX/return tracks
    // 8 effect tracks, 0 scenes
    var effectTrackBank = host.createEffectTrackBank(8, 0);

    // Initialize Bitwig namespace with track bank and transport
    Bitwig.init(trackBank, transport);
    Bitwig._effectTrackBank = effectTrackBank;

    // Subscribe to track properties for tree building
    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        track.exists().markInterested();
        track.name().markInterested();
        track.isGroup().markInterested();
        track.solo().markInterested();
        track.color().markInterested();
        track.volume().markInterested();

        // Add name change observer with closure to capture track ID
        (function(trackId, trackObj) {
            trackObj.name().addValueObserver(function(name) {
                // Only handle name changes after initial load
                if (name && name !== "") {
                    Controller.handleTrackNameChange(trackId, name);
                }
            });

            // Add volume observer that checks for encoder links
            trackObj.volume().addValueObserver(128, function(value) {
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber && LaunchpadModeSwitcher.currentMode === LaunchpadModeSwitcher.modeEnum.VOLUME) {
                    Twister.setEncoderLED(encoderNumber, value);
                }
            });

            // Add pan observer that checks for encoder links
            trackObj.pan().markInterested();
            trackObj.pan().addValueObserver(128, function(value) {
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber && LaunchpadModeSwitcher.currentMode === LaunchpadModeSwitcher.modeEnum.PAN) {
                    Twister.setEncoderLED(encoderNumber, value);
                }
            });

            // Add send observers for bi-directional sync in Send A mode
            var sendBank = trackObj.sendBank();
            for (var s = 0; s < 8; s++) {
                (function(tid, sendIndex) {
                    var send = sendBank.getItemAt(sendIndex);
                    send.value().markInterested();
                    send.value().addValueObserver(128, function(value) {
                        var key = tid + '_' + sendIndex;
                        var encoderNum = Twister._sendToEncoder ? Twister._sendToEncoder[key] : null;
                        if (encoderNum && LaunchpadModeSwitcher.currentMode === LaunchpadModeSwitcher.modeEnum.SEND_A) {
                            Twister.setEncoderLED(encoderNum, value);
                        }
                    });
                })(trackId, s);
            }

            // Add mute observer for track grid
            trackObj.mute().markInterested();
            trackObj.mute().addValueObserver(function(isMuted) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add solo observer for track grid
            trackObj.solo().markInterested();
            trackObj.solo().addValueObserver(function(isSoloed) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add record arm observer for track grid
            trackObj.arm().markInterested();
            trackObj.arm().addValueObserver(function(isArmed) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add color observer that checks for encoder and pad links
            trackObj.color().addValueObserver(function(red, green, blue) {
                // Update encoder colors
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber) {
                    var redMidi = Math.round(red * 255);
                    var greenMidi = Math.round(green * 255);
                    var blueMidi = Math.round(blue * 255);
                    Twister.setEncoderColor(encoderNumber, redMidi, greenMidi, blueMidi);
                }

                // Update pad colors - check if this is a track grid pad or group selector pad
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var currentMode = LaunchpadModeSwitcher.currentMode;
                    var modeEnum = LaunchpadModeSwitcher.modeEnum;

                    // Check if this is a group selector pad
                    var isGroupSelector = LaunchpadQuadrant.bottomRight.getGroup(padNumber) !== null;

                    if (isGroupSelector) {
                        // Group selector pad - use bright/dim based on selection
                        var launchpadColor = Launchpad.bitwigColorToLaunchpad(red, green, blue);

                        if (Controller.selectedGroup &&
                            LaunchpadQuadrant.bottomRight.getGroup(padNumber) === Controller.selectedGroup) {
                            var brightColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.bright);
                            Launchpad.setPadColor(padNumber, brightColor);
                        } else {
                            var dimColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.dim);
                            Launchpad.setPadColor(padNumber, dimColor);
                        }
                    } else {
                        // Track grid pad - only update if NOT in mute/solo/record arm mode
                        if (currentMode !== modeEnum.MUTE && currentMode !== modeEnum.SOLO && currentMode !== modeEnum.RECORD_ARM) {
                            var color = Launchpad.getTrackGridPadColor(trackId);
                            Launchpad.setPadColor(padNumber, color);
                        }
                    }
                }
            });
        })(i, track);
    }

    // Set up effect track observers and cache FX tracks on startup
    for (var e = 0; e < 8; e++) {
        var effectTrack = effectTrackBank.getItemAt(e);
        effectTrack.name().markInterested();
        effectTrack.volume().markInterested();
        effectTrack.color().markInterested();
        effectTrack.exists().markInterested();

        (function(effectIndex, effTrack) {
            // Add volume observer for bi-directional sync
            effTrack.volume().addValueObserver(function(value) {
                // Update encoder LED if this effect track is linked
                var encoderNum = Twister._effectTrackToEncoder ? Twister._effectTrackToEncoder[effectIndex] : null;
                if (encoderNum) {
                    Twister.setEncoderLED(encoderNum, Math.round(value * 127));
                }
            });

            // Cache FX track info when name changes (detects [N] pattern)
            effTrack.name().addValueObserver(function(name) {
                Bitwig._updateFxTrackCache(effectIndex, name, effTrack);
            });

            // Update encoder color when effect track color changes
            effTrack.color().addValueObserver(function(red, green, blue) {
                var encoderNum = Twister._effectTrackToEncoder ? Twister._effectTrackToEncoder[effectIndex] : null;
                if (encoderNum) {
                    Twister.setEncoderColor(encoderNum,
                        Math.round(red * 255),
                        Math.round(green * 255),
                        Math.round(blue * 255));
                }
            });
        })(e, effectTrack);
    }

    // Add tempo observer for encoder sync (bi-directional like volume/pan)
    transport.tempo().addRawValueObserver(function(bpm) {
        // Only update if tempo encoder is linked (top-level group selected)
        if (Controller.selectedGroup === 16) {
            var ledValue = Math.round((bpm - Twister.TEMPO_MIN) / (Twister.TEMPO_MAX - Twister.TEMPO_MIN) * 127);
            ledValue = Math.max(0, Math.min(127, ledValue));
            Twister.setEncoderLED(Twister.TEMPO_ENCODER, ledValue);
        }
    });

    // Enter Programmer Mode on Launchpad MK2
    Launchpad.enterProgrammerMode();

    // Set up marker observers
    var markerBank = Bitwig.getMarkerBank();
    if (markerBank) {
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);

            // Mark properties as interested
            marker.exists().markInterested();
            marker.getColor().markInterested();
            marker.position().markInterested();  // Needed for prepareRecordingAtMarker

            // Observe exists changes to refresh lane
            (function(markerIndex) {
                marker.exists().addValueObserver(function(exists) {
                    if (debug) println("Marker " + markerIndex + " exists: " + exists);
                    LaunchpadLane.refresh();
                });

                // Observe color changes to refresh lane
                marker.getColor().addValueObserver(function(red, green, blue) {
                    if (debug) println("Marker " + markerIndex + " color changed");
                    LaunchpadLane.refresh();
                });
            })(i);
        }
    }

    // Initialize LaunchpadQuadrant
    LaunchpadQuadrant.bottomRight.init();
    LaunchpadQuadrant.bottomLeft.init();

    // Initialize marker lane
    LaunchpadLane.init();

    // Initialize control buttons
    LaunchpadTopButtons.init();

    // Initialize clip launcher
    ClipLauncher.init();

    // Initialize Roland Piano transpose
    RolandPiano.init();

    // Initialize nanoKEY2 on port 3
    NanoKey2.init();
    if (debug) println("nanoKEY2 initialized on port 3 - expecting nanoKEY2 to be configured as input port 3");

    // Set up MIDI callback for nanoKEY2
    host.getMidiInPort(3).setMidiCallback(function(status, data1, data2) {
        // Log MIDI from port 3 when debug is enabled
        if (debug) {
            println("nanoKEY2 MIDI: " + status + ", " + data1 + ", " + data2 + " [" +
                    status.toString(16) + " " + data1.toString(16) + " " + data2.toString(16) + "]");
        }

        // Handle note on messages (status 0x90) with velocity > 0
        if (status === 0x90 && data2 > 0) {
            if (debug) println("  -> Note ON detected, calling handleKeySelection(" + data1 + ")");
            NanoKey2.handleKeySelection(data1);
        }
    });

    // Register pages
    Pages.registerPage(Page_MainControl);
    Pages.registerPage(Page_ClipLauncher);
    Pages.registerPage(Page_ThirdDummy);

    // Initialize pagination system (after pages registered)
    Pages.init();

    // Initialize Pager (reactive page state manager)
    Pager.init();

    // Initialize mode switcher
    LaunchpadModeSwitcher.init();

    // Initialize controller logic
    Controller.init();

    // Build and print track tree for debugging (delayed to allow track bank to populate)
    host.scheduleTask(function() {
        if (debug) println("=== Calculating track depths ===");
        calculateTrackDepths();
        if (debug) println("=== Building track tree ===");
        var tree = Bitwig.getTrackTree();
        printTrackTree(tree);

        // Refresh group display now that track depths are calculated
        Controller.refreshGroupDisplay();

        // Refresh marker lane
        LaunchpadLane.refresh();
    }, null, 100);  // Wait 100ms for track bank to populate
}

function onSysex(data) {
    printSysex(data);
}

function flush() {
}

function exit() {
    Controller.exit();
}
