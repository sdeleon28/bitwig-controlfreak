/**
 * Clip launcher control for Bitwig session view
 */
class ClipLauncherHW {
    constructor(deps) {
        deps = deps || {};
        this.host = deps.host || null;
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.clipGestures = deps.clipGestures || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.pageNumber = 3;  // Clip launcher on page 3
        this._trackBank = null;
        this._sceneBank = null;
        this._numTracks = 7;   // Rows 1-7 for clips
        this._numScenes = 8;   // Columns 1-8 for scenes
        this._trackColors = [];  // Store track colors [{r, g, b}] per track
        this._duplicateSource = null; // {trackIndex, sceneIndex} of source clip for duplicate gesture
    }

    init() {
        var self = this;
        // Create track bank: 7 tracks, 0 sends, 8 scenes
        this._trackBank = this.host.createMainTrackBank(this._numTracks, 0, this._numScenes);

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

        if (this.debug) this.println("ClipLauncher initialized: " + this._numTracks + " tracks × " + this._numScenes + " scenes (Bitwig layout)");
    }

    setupClipObservers() {
        for (var t = 0; t < this._numTracks; t++) {
            for (var s = 0; s < this._numScenes; s++) {
                this.setupSlotObserver(t, s);
            }

            // Set up track color observer
            this.setupTrackColorObserver(t);
        }
    }

    setupSlotObserver(trackIndex, sceneIndex) {
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
    }

    setupTrackColorObserver(trackIndex) {
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
    }

    setupSceneObservers() {
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
    }

    updateClipPad(trackIndex, sceneIndex) {
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
            this.pager.requestPaintFlashing(this.pageNumber, padNote, clipState.color);
        } else if (clipState.mode === 'pulsing') {
            this.pager.requestPaintPulsing(this.pageNumber, padNote, clipState.color);
        } else {
            this.pager.requestPaint(this.pageNumber, padNote, clipState.color);
        }

        // Also update the scene pad since clip state affects scene display
        this.updateScenePad(sceneIndex);
    }

    updateScenePad(sceneIndex) {
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
            color = this.launchpad.colors.green;
        } else if (hasContent) {
            color = 21;  // Dim green
        } else {
            color = 0;  // Off
        }

        // Use Pager gatekeeper - only paints if page is active
        this.pager.requestPaint(this.pageNumber, padNote, color);
    }

    launchScene(sceneIndex) {
        var scene = this._sceneBank.getItemAt(sceneIndex);
        scene.launch();
        if (this.debug) this.println("Launching scene " + sceneIndex);
    }

    /**
     * Get clip state including color and LED mode
     * @returns {Object} {color: number, mode: 'static'|'flashing'|'pulsing'}
     */
    getClipState(slot, trackColor) {
        // Priority: recording queued > recording > playback queued > playing > has content > empty

        if (slot.isRecordingQueued().get()) {
            return { color: this.launchpad.colors.red, mode: 'flashing' };
        }

        if (slot.isRecording().get()) {
            return { color: this.launchpad.colors.red, mode: 'static' };
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
    }

    mixColor(c1, c2, ratio) {
        return {
            r: c1.r * (1 - ratio) + c2.r * ratio,
            g: c1.g * (1 - ratio) + c2.g * ratio,
            b: c1.b * (1 - ratio) + c2.b * ratio
        };
    }

    rgbToLaunchpadColor(r, g, b) {
        // Convert RGB (0-1) to closest Launchpad color
        // This is a simplified version - could be more sophisticated

        if (r < 0.1 && g < 0.1 && b < 0.1) return 0;  // Black/off

        // Determine dominant color
        var max = Math.max(r, g, b);
        var brightness = max > 0.7 ? 1 : 0.5;  // Bright or dim

        if (r > g && r > b) {
            // Red dominant
            return brightness > 0.7 ? this.launchpad.colors.red : 1;
        } else if (g > r && g > b) {
            // Green dominant
            return brightness > 0.7 ? this.launchpad.colors.green : 21;
        } else if (b > r && b > g) {
            // Blue dominant
            return brightness > 0.7 ? this.launchpad.colors.blue : 41;
        } else if (r > 0.5 && g > 0.5 && b < 0.3) {
            // Yellow
            return brightness > 0.7 ? this.launchpad.colors.yellow : 13;
        } else if (r > 0.5 && g < 0.3 && b > 0.5) {
            // Purple/Magenta
            return brightness > 0.7 ? this.launchpad.colors.purple : 53;
        } else {
            // White/Gray
            return brightness > 0.7 ? 3 : 1;
        }
    }

    launchClip(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);
        slot.launch();

        if (this.debug) this.println("Launch clip: track " + trackIndex + ", scene " + sceneIndex);
    }

    recordClip(trackIndex, sceneIndex) {
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

        if (this.debug) this.println("Record clip: track " + trackIndex + ", scene " + sceneIndex);
    }

    deleteClip(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);
        slot.deleteObject();
        if (this.debug) this.println("Delete clip: track " + trackIndex + ", scene " + sceneIndex);
    }

    registerPadBehaviors() {
        var self = this;
        // Rows 1-7 = clip pads (7 tracks × 8 scenes)
        for (var trackIndex = 0; trackIndex < this._numTracks; trackIndex++) {
            for (var sceneIndex = 0; sceneIndex < this._numScenes; sceneIndex++) {
                (function(t, s) {
                    var row = 7 - t;
                    var col = s + 1;
                    var padNote = row * 10 + col;

                    self.launchpad.registerPadBehavior(padNote,
                        // Click callback - delegates to ClipGestures
                        function() {
                            var track = self._trackBank.getItemAt(t);
                            var slot = track.clipLauncherSlotBank().getItemAt(s);
                            self.clipGestures.executeClick(t, s, slot);
                        },
                        // Hold callback - delegates to ClipGestures
                        function() {
                            var track = self._trackBank.getItemAt(t);
                            var slot = track.clipLauncherSlotBank().getItemAt(s);
                            self.clipGestures.executeHold(t, s, slot);
                        },
                        self.pageNumber  // Page 3 - clip launcher
                    );
                })(trackIndex, sceneIndex);
            }
        }
        if (this.debug) this.println("ClipLauncher pad behaviors registered");
    }

    stopTrack(trackIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        track.stop();

        if (this.debug) this.println("Stop track: " + trackIndex);
    }

    refresh() {
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
    }

    // Duplicate gesture handler (used by ClipGestures modifier)
    handleDuplicateClick(trackIndex, sceneIndex) {
        var track = this._trackBank.getItemAt(trackIndex);
        var slot = track.clipLauncherSlotBank().getItemAt(sceneIndex);

        if (!this._duplicateSource) {
            // First click - select source (must have content)
            if (slot.hasContent().get()) {
                this._duplicateSource = { trackIndex: trackIndex, sceneIndex: sceneIndex };
                // Highlight source pad pink
                var padNote = (7 - trackIndex) * 10 + (sceneIndex + 1);
                this.pager.requestPaint(this.pageNumber, padNote, this.launchpad.colors.pink);
                if (this.debug) this.println("Duplicate source: track " + trackIndex + ", scene " + sceneIndex);
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
    }

    clearDuplicateSource() {
        if (this._duplicateSource) {
            // Restore original color by triggering update
            this.updateClipPad(this._duplicateSource.trackIndex, this._duplicateSource.sceneIndex);
        }
        this._duplicateSource = null;
    }

    duplicateClip(srcTrack, srcScene, dstTrack, dstScene) {
        var srcSlot = this._trackBank.getItemAt(srcTrack).clipLauncherSlotBank().getItemAt(srcScene);
        var dstSlot = this._trackBank.getItemAt(dstTrack).clipLauncherSlotBank().getItemAt(dstScene);
        dstSlot.copyFrom(srcSlot);
        if (this.debug) this.println("Duplicated clip from (" + srcTrack + "," + srcScene + ") to (" + dstTrack + "," + dstScene + ")");
    }
}

var ClipLauncher = {};
if (typeof module !== 'undefined') module.exports = ClipLauncherHW;
