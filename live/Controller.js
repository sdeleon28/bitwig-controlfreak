/**
 * Controller — top-level orchestrator for the Live script.
 *
 * Responsibilities:
 *   - Build all components and inject their dependencies.
 *   - Maintain the encoder linking: scan tracks for the "(N)" naming
 *     convention and link encoders 1..15 to those tracks. Encoder 16
 *     always links to the master track.
 *   - Re-run encoder linking whenever Bitwig.onTracksUpdated fires.
 *   - Route Launchpad and Twister MIDI input into the right handlers.
 *
 * The orchestrator does NOT paint anything itself — it delegates all
 * painting to its pages, which go through the Pager.
 */
class ControllerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.bitwig
     * @param {Object} deps.launchpad
     * @param {Object} deps.twister
     * @param {Object} deps.pager
     * @param {Object} deps.mainPager
     * @param {Object} deps.songPager
     * @param {Object} deps.barPager
     * @param {Object} deps.modeSwitcher
     * @param {Object} deps.sideButtons
     * @param {Object} deps.pageControl
     * @param {Object} deps.pageProjectExplorer
     * @param {Object} deps.host
     */
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig;
        this.launchpad = deps.launchpad;
        this.twister = deps.twister;
        this.pager = deps.pager;
        this.mainPager = deps.mainPager;
        this.songPager = deps.songPager;
        this.barPager = deps.barPager;
        this.modeSwitcher = deps.modeSwitcher;
        this.sideButtons = deps.sideButtons;
        this.pageControl = deps.pageControl;
        this.pageProjectExplorer = deps.pageProjectExplorer;
        this.host = deps.host;
    }

    init() {
        var self = this;

        this.pageControl.init();
        this.pageProjectExplorer.init();

        this.songPager.init();
        this.barPager.init();
        this.modeSwitcher.init();
        this.sideButtons.init();

        // Project explorer manual zoom buttons (cc 108 / 109)
        this.launchpad.registerTopButton(this.launchpad.buttons.decreaseResolution, function() {
            self.pageProjectExplorer.decreaseResolution();
        }, this.pageProjectExplorer.pageNumber);
        this.launchpad.registerTopButton(this.launchpad.buttons.increaseResolution, function() {
            self.pageProjectExplorer.increaseResolution();
        }, this.pageProjectExplorer.pageNumber);

        // Linking: every time the track list / properties change, re-link
        // encoders. This catches name changes ("(3)" added/removed),
        // creation, and deletion in one go.
        this.bitwig.onTracksUpdated(function() {
            self.relinkEncoders();
        });

        // Loop range observers — wire transport directly so the project
        // explorer's loop highlight stays in sync.
        var transport = this.bitwig.getTransport();
        if (transport) {
            transport.arrangerLoopStart().addValueObserver(function(beat) {
                self.pageProjectExplorer.setLoopRange(beat, transport.arrangerLoopDuration().get());
            });
            transport.arrangerLoopDuration().addValueObserver(function(duration) {
                self.pageProjectExplorer.setLoopRange(transport.arrangerLoopStart().get(), duration);
            });
        }

        this.mainPager.init();

        // Initial linking + paint after Bitwig has had a moment to populate
        if (this.host && this.host.scheduleTask) {
            this.host.scheduleTask(function() {
                self.relinkEncoders();
                self.pageProjectExplorer.rebuildFromBitwig();
                self.songPager.refreshButtons();
                self.barPager.refreshButtons();
            }, null, 200);
        } else {
            self.relinkEncoders();
            self.pageProjectExplorer.rebuildFromBitwig();
        }
    }

    /**
     * Walk slots 1..15 from Bitwig's slot map and (re)link the corresponding
     * encoder to the right track. Encoder 16 -> master track.
     */
    relinkEncoders() {
        // Unlink everything first so deleted/removed tracks lose their encoder.
        this.twister.unlinkAll();

        var slotMap = this.bitwig.getSlotMap();
        for (var slot = 1; slot <= 15; slot++) {
            if (slotMap[slot] !== undefined) {
                this.twister.linkEncoderToTrack(slot, slotMap[slot]);
            }
        }
        var master = this.bitwig.getMasterTrack();
        if (master) this.twister.linkEncoderToMaster(16, master);
    }

    // ---- MIDI routing ----

    onLaunchpadMidi(status, data1, data2) {
        // Top buttons (CC) — only fire on press, ignore the release event
        if (status === 0xB0) {
            if (data2 === 0) return;
            this.launchpad.handleTopButtonPress(data1);
            return;
        }

        // Note on / off — pad presses or side buttons
        if (status === 0x90 && data2 > 0) {
            if (this.launchpad.isSideButton(data1)) {
                this.launchpad.handleSideButtonPress(data1);
                return;
            }
            this.launchpad.handlePadPress(data1);
            return;
        }
        if ((status === 0x90 && data2 === 0) || status === 0x80) {
            if (this.launchpad.isSideButton(data1)) return;
            this.launchpad.handlePadRelease(data1);
        }
    }

    onTwisterMidi(status, data1, data2) {
        var encoder = this.twister.ccToEncoder(data1);
        if (status === 0xB0) {
            this.twister.handleEncoderTurn(encoder, data2);
        } else if (status === 0xB1) {
            this.twister.handleEncoderPress(encoder, data2 > 0);
        }
    }
}

if (typeof module !== 'undefined') module.exports = ControllerHW;
