package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;

/**
 * Base for the Twister programs that lay the tracks of the selected group out
 * across the encoders (vol/pan, sends-to-fx). Each track's color LED is painted
 * at its 1..16 position; the ring value is delegated to {@link #paintRing}.
 */
public abstract class TwisterTrackCtl extends TwisterTrackEncoderCtl {
    int SOLO_COLOR = 66;

    public TwisterTrackCtl(IEventBus bus) {
        super(bus);
    }

    /**
     * Shares the lifecycle with the base TrackCtl, which also powers the
     * Launchpad paint. Since the colored LEDs change at the same time as the
     * Launchpad lights do, this method only paints the colors and leaves the
     * rings alone. For rings painting, see paintRings.
     */
    @Override
    protected void paint() {
        if (!isActive()) return;
        this.clearLeds();
        for (var t : this.tracksInSelectedGroup()) {
            var pos = t.getPosition();
            if (pos == -1)
                continue;
            var color = t.solo ? SOLO_COLOR : this.bwToTwisterColor(t.color);
            this.bus.send(new PaintEncoder(pos, color));
        }
    }

    @Override
    protected void groupUpdated() {
        this.paintRings();
    }

    /** Paints one track's ring value; defines what this program displays. */
    protected abstract void paintRing(BitwigTrack t);

    @Override
    protected void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        this.tracksInSelectedGroup().forEach(this::paintRing);
    }
}
