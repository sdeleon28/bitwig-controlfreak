/**
 * Control page (page 1 of the Live controller).
 *
 * Layout (8x8 grid, bottom-left = pad 11, top-right = pad 88):
 *
 *      +-----------+-----------+
 *      | Select    | Mute      |   <- top half (yOffset 4)
 *      +-----------+-----------+
 *      | RecArm    | Solo      |   <- bottom half (yOffset 0)
 *      +-----------+-----------+
 *
 * Each quadrant maps slots 1..16 to top-level tracks named "(N)".
 * Track colors are read from Bitwig and translated to launchpad palette
 * via Launchpad.bitwigColorToLaunchpad. Active state (rec/solo/mute)
 * overrides the track color.
 *
 * Repaint discipline: on every Bitwig "tracks updated" event, repaint
 * ALL 64 quadrant pads. No incremental updates. UI is a pure function
 * of state.
 *
 * The Quadrant base class (LiveQuadrant) lives here rather than in its
 * own file to keep all class inheritance inside a single source file —
 * Bitwig's loader treats class declarations across loaded files as a
 * single shared lexical scope, which makes cross-file `extends`
 * fragile. The base is exported alongside the page class so tests can
 * import it directly.
 */
class LiveQuadrant {
    /**
     * @param {Object} deps
     * @param {Object} deps.bitwig
     * @param {Object} deps.launchpad
     * @param {Object} deps.pager
     * @param {number} deps.pageNumber
     * @param {number} deps.xOffset - 0 or 4
     * @param {number} deps.yOffset - 0 or 4
     */
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig;
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.pageNumber = deps.pageNumber;
        this.xOffset = deps.xOffset || 0;
        this.yOffset = deps.yOffset || 0;
    }

    localToNote(localPad) {
        var n0 = localPad - 1;
        var localRow = Math.floor(n0 / 4);
        var localCol = n0 % 4;
        var gridRow = this.yOffset + localRow;
        var gridCol = this.xOffset + localCol;
        return (gridRow + 1) * 10 + (gridCol + 1);
    }

    noteToLocal(note) {
        var gridRow = Math.floor(note / 10) - 1;
        var gridCol = (note % 10) - 1;
        if (gridRow < this.yOffset || gridRow >= this.yOffset + 4) return null;
        if (gridCol < this.xOffset || gridCol >= this.xOffset + 4) return null;
        return (gridRow - this.yOffset) * 4 + (gridCol - this.xOffset) + 1;
    }

    forEachSlot(callback) {
        for (var slot = 1; slot <= 16; slot++) {
            var note = this.localToNote(slot);
            var trackId = this.bitwig.getTrackIdForSlot(slot);
            var track = (trackId === null) ? null : this.bitwig.getTrack(trackId);
            callback(slot, note, trackId, track);
        }
    }

    paint() {
        var self = this;
        this.forEachSlot(function(slot, note, trackId, track) {
            if (!track) {
                self.pager.requestPaint(self.pageNumber, note, self.launchpad.colors.off);
                return;
            }
            self.pager.requestPaint(self.pageNumber, note, self.padColorFor(track));
        });
    }

    padColorFor(track) {
        var c = track.color();
        return this.launchpad.bitwigColorToLaunchpad(c.red(), c.green(), c.blue());
    }

    onPadClick(slotNumber, track) {
        // no-op (override)
    }

    registerBehaviors() {
        var self = this;
        this.forEachSlot(function(slot, note) {
            self.launchpad.registerPadBehavior(note, function() {
                var trackId = self.bitwig.getTrackIdForSlot(slot);
                if (trackId === null) return;
                var track = self.bitwig.getTrack(trackId);
                if (!track) return;
                self.onPadClick(slot, track);
            }, null, self.pageNumber);
        });
    }
}

class RecArmQuadrant extends LiveQuadrant {
    constructor(deps) {
        super(Object.assign({}, deps, { xOffset: 0, yOffset: 0 }));
    }
    padColorFor(track) {
        if (track.arm().get()) return this.launchpad.colors.red;
        var c = track.color();
        return this.launchpad.bitwigColorToLaunchpad(c.red(), c.green(), c.blue());
    }
    onPadClick(slot, track) {
        track.arm().toggle();
    }
}

class SoloQuadrant extends LiveQuadrant {
    constructor(deps) {
        super(Object.assign({}, deps, { xOffset: 4, yOffset: 0 }));
    }
    padColorFor(track) {
        if (track.solo().get()) return this.launchpad.colors.yellow;
        var c = track.color();
        return this.launchpad.bitwigColorToLaunchpad(c.red(), c.green(), c.blue());
    }
    onPadClick(slot, track) {
        track.solo().toggle();
    }
}

class SelectQuadrant extends LiveQuadrant {
    constructor(deps) {
        super(Object.assign({}, deps, { xOffset: 0, yOffset: 4 }));
    }
    padColorFor(track) {
        var c = track.color();
        return this.launchpad.bitwigColorToLaunchpad(c.red(), c.green(), c.blue());
    }
    onPadClick(slot, track) {
        track.selectInMixer();
        if (track.makeVisibleInArranger) track.makeVisibleInArranger();
    }
}

class MuteQuadrant extends LiveQuadrant {
    constructor(deps) {
        super(Object.assign({}, deps, { xOffset: 4, yOffset: 4 }));
    }
    padColorFor(track) {
        if (track.mute().get()) return this.launchpad.colors.orange;
        var c = track.color();
        return this.launchpad.bitwigColorToLaunchpad(c.red(), c.green(), c.blue());
    }
    onPadClick(slot, track) {
        track.mute().toggle();
    }
}

class PageControlHW {
    constructor(deps) {
        deps = deps || {};
        this.bitwig = deps.bitwig;
        this.launchpad = deps.launchpad;
        this.pager = deps.pager;
        this.pageNumber = deps.pageNumber;
        // Side button helper used to clear transport-related side buttons
        // when leaving a page that displayed them.
        this.sideButtons = deps.sideButtons || null;

        var qDeps = {
            bitwig: this.bitwig,
            launchpad: this.launchpad,
            pager: this.pager,
            pageNumber: this.pageNumber
        };
        this.recArm = new RecArmQuadrant(qDeps);
        this.solo = new SoloQuadrant(qDeps);
        this.select = new SelectQuadrant(qDeps);
        this.mute = new MuteQuadrant(qDeps);
        this.quadrants = [this.recArm, this.solo, this.select, this.mute];
    }

    init() {
        var self = this;
        for (var i = 0; i < this.quadrants.length; i++) {
            this.quadrants[i].registerBehaviors();
        }
        this.bitwig.onTracksUpdated(function() { self.paint(); });
    }

    /**
     * Called by MainPager when this page becomes the active page.
     * Refreshes UI elements that live outside the grid (top buttons,
     * side buttons) so they reflect this page's state.
     */
    show() {
        // Clear top buttons that the project explorer owns
        var off = this.launchpad.colors.off;
        var b = this.launchpad.buttons;
        this.launchpad.setTopButtonColor(b.left, off);
        this.launchpad.setTopButtonColor(b.right, off);
        this.launchpad.setTopButtonColor(b.decreaseResolution, off);
        this.launchpad.setTopButtonColor(b.increaseResolution, off);
        this.launchpad.setTopButtonColor(b.barPagePrev, off);
        this.launchpad.setTopButtonColor(b.barPageNext, off);
        // Clear transport side buttons (volume/pan stay on, owned by ModeSwitcher)
        if (this.sideButtons) this.sideButtons.clearColors();
        this.paint();
    }

    paint() {
        for (var i = 0; i < this.quadrants.length; i++) {
            this.quadrants[i].paint();
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = PageControlHW;
    module.exports.LiveQuadrant = LiveQuadrant;
    module.exports.RecArmQuadrant = RecArmQuadrant;
    module.exports.SoloQuadrant = SoloQuadrant;
    module.exports.SelectQuadrant = SelectQuadrant;
    module.exports.MuteQuadrant = MuteQuadrant;
}
