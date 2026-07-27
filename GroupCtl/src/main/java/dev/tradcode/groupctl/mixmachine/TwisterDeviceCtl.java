package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RcExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestInitRcs;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;

/**
 * Twister program: the grabbed device's remote controls, spread across all 16
 * encoders. The bottom 8 (positions 1..8) host the first remote-controls page,
 * the top 8 (positions 9..16) the second; both come through as flat 0..15 slots
 * via {@link TwisterRcGeometry}. Only slots whose parameter exists are lit, so a
 * device with a single page leaves the top 8 encoders dark.
 */
public class TwisterDeviceCtl implements IEventBusSubscriber {
    static int SLOT_COUNT = TwisterRcGeometry.SLOT_COUNT;
    static int RC_COLOR = 25;

    static final Set<String> RC_BLACKLIST = Set.of("Frequalizer Alt");

    IEventBus bus;
    boolean grabbed = false;
    String grabbedName = null;
    boolean editorPageActive = false;
    boolean[] exists = new boolean[SLOT_COUNT];

    public TwisterDeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.grabbed
            && this.grabbedName != null
            && !RC_BLACKLIST.contains(this.grabbedName)
            && !this.editorPageActive;
    }

    private void deselect() {
        this.grabbed = false;
        this.grabbedName = null;
    }

    private void clearLeds() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new PaintEncoder(i, 0));
    }

    private void clearRings() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new SetEncoderValue(i, 0));
    }

    private void paint() {
        if (!isActive()) return;
        this.clearLeds();
        for (int slot = 0; slot < SLOT_COUNT; slot++)
            this.paintLed(slot);
    }

    private void paintLed(int slot) {
        if (!isActive()) return;
        this.bus.send(
            new PaintEncoder(TwisterRcGeometry.positionForSlot(slot), this.exists[slot] ? RC_COLOR : 0)
        );
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case DeviceGrabbed(String name) -> {
                this.grabbed = true;
                this.grabbedName = name;
                if (!isActive()) return;
                this.clearRings();
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (!isActive()) return;
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case BitwigTrackSelected(int n) -> this.deselect();
            case RequestSelectTrack(int trackId, String name) -> this.deselect();
            case RequestFxSelectTrack(int id, String name) -> this.deselect();
            case RcExistsChanged(int slot, boolean e) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.exists[slot] = e;
                this.paintLed(slot);
            }
            case RcValueChanged(int slot, double v) -> {
                if (!isActive()) return;
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.bus.send(
                    new SetEncoderValue(
                        TwisterRcGeometry.positionForSlot(slot),
                        (int) Math.round(v * 127.0)
                    )
                );
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0) return;
                this.bus.send(
                    new SetRcValue(
                        slot,
                        (double) v / 127.0
                    )
                );
            }
            default -> { }
        }
    }
}
