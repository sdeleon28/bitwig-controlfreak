package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.SetEncoderValue;

/**
 * Shared base for the Twister programs that drive the 16 encoders from the
 * tracks in the selected group (vol/pan, sends-to-fx, …).
 *
 * <p>Each concrete subclass owns one program and decides — purely from the
 * events flowing through the bus — when it is the {@link #active} owner of the
 * encoders. Only the active program paints or reacts to encoder turns, so the
 * programs never fight over the hardware. Grabbing a device releases every
 * program; that transition is shared and lives here.
 */
public abstract class TwisterTrackCtl extends TrackCtl {
    boolean active = false;

    public TwisterTrackCtl(IEventBus bus) {
        super(bus);
    }

    protected int bwToTwisterColor(String bwColor) {
        return Colors.toTwister(bwColor);
    }

    protected void clearLeds() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new PaintEncoder(i, 0));
    }

    protected void clearRings() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new SetEncoderValue(i, 0));
    }

    /**
     * Shares the lifecycle with the base TrackCtl, which also powers the
     * Launchpad paint. Since the colored LEDs change at the same time as the
     * Launchpad lights do, this method only paints the colors and leaves the
     * rings alone. For rings painting, see paintRings.
     */
    @Override
    protected void paint() {
        if (!active) return;
        this.clearLeds();
        for (var t : this.tracksInSelectedGroup()) {
            var pos = t.getPosition();
            if (pos == -1)
                continue;
            this.bus.send(
                new PaintEncoder(pos, this.bwToTwisterColor(t.color)
            ));
        }
    }

    @Override
    protected void groupUpdated() {
        this.paintRings();
    }

    /** Paints one track's ring value; defines what this program displays. */
    protected abstract void paintRing(BitwigTrack t);

    protected void paintRings() {
        if (!active) return;
        this.clearRings();
        this.tracksInSelectedGroup().forEach(this::paintRing);
    }

    /** Repaint everything this program owns; used on (de)activation. */
    protected void refresh() {
        this.paint();
        this.paintRings();
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            // state source of truth is on our end for device selection, so we
            // match on the request instead of the response from bw
            case RequestSelectDevice(int n) -> this.active = false;
            default -> { }
        }
    }
}
