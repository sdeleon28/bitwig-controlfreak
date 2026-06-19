package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;

/**
 * Base for the track-context Twister programs — those that map the current
 * track/group/FX selection onto the 16 encoders (vol/pan, sends-to-fx,
 * send-track-to-all-fx). RC mode ({@link TwisterDeviceCtl}) is the separate
 * device-context program and is deliberately not part of this hierarchy.
 *
 * <p>Holds the {@link #active} flag, the LED/ring clearing helpers, and the one
 * transition every program here shares — when a device is selected, RC mode
 * acquires the encoders, so every program here releases them (deactivates).
 *
 * <p>Subclasses decide their own activation rules and define what
 * {@link #paint()} and {@link #paintRings()} draw. Only the active program
 * paints or reacts to encoder turns, so the programs never fight over the
 * hardware.
 */
public abstract class TwisterTrackEncoderCtl extends TrackCtl {
    boolean active = false;

    /**
     * The editor page borrows the whole Twister, so every program here goes dark
     * there. {@link #active} keeps tracking the selection state underneath, so
     * leaving the editor page restores whatever was showing before.
     */
    boolean editorPageActive = false;

    public TwisterTrackEncoderCtl(IEventBus bus) {
        super(bus);
    }

    protected boolean isActive() {
        return this.active && !this.editorPageActive;
    }

    private void onPageSelected(int n) {
        this.editorPageActive = n == Page.EDITOR.getValue();
        if (!this.editorPageActive)
            this.refresh();
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

    /** Paints the encoder ring values; defines what this program shows. */
    protected abstract void paintRings();

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
            case PageSelected(int n) -> this.onPageSelected(n);
            default -> { }
        }
    }
}
