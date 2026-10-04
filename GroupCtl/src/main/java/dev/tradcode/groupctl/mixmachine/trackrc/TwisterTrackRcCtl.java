package dev.tradcode.groupctl.mixmachine.trackrc;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.SelectedTrackEncoder;
import dev.tradcode.groupctl.mixmachine.TwisterRcGeometry;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.SetTrackRcValue;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcNameChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcValueChanged;

/**
 * Twister program: the selected track's remote controls, spread across all 16
 * encoders. The bottom 8 (positions 1..8) host the first remote-controls page,
 * the top 8 (positions 9..16) the second; both come through as flat 0..15 slots
 * via {@link TwisterRcGeometry}. Activation follows the selection of a plain
 * (non-group) track; selecting a group hands the encoders back to the vol/pan
 * overview, and — like every other twister program — a device selection or the
 * "selected track, then FX" gesture borrows them. Encoder 16 is the
 * {@link SelectedTrackEncoder} instead of an RC.
 */
public class TwisterTrackRcCtl implements IEventBusSubscriber {
    static int SLOT_COUNT = TwisterRcGeometry.SLOT_COUNT;
    static int RC_COLOR = 19; // twister blinding cyan, mirrors the master/device RCs

    IEventBus bus;
    Set<Integer> selectableTrackIds = new HashSet<>();
    boolean trackSelected = false;
    boolean editorPageActive = false;
    boolean borrowed = false; // a device or the send-to-all-fx program took the encoders
    double[] values = new double[SLOT_COUNT];
    boolean[] exists = new boolean[SLOT_COUNT];
    String[] names = new String[SLOT_COUNT];
    SelectedTrackEncoder trackEncoder;

    public TwisterTrackRcCtl(IEventBus bus) {
        this.bus = bus;
        this.trackEncoder = new SelectedTrackEncoder(bus);
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.trackSelected && !this.editorPageActive && !this.borrowed;
    }

    private boolean isSelectable(int id) {
        return this.selectableTrackIds.contains(id);
    }

    private void collectSelectable(ArrayList<BitwigTrack> tracks, Set<Integer> out) {
        for (var t : tracks) {
            if (!t.isGroup)
                out.add(t.id);
            this.collectSelectable(t.children, out);
        }
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
        if (slot == SelectedTrackEncoder.SLOT) {
            this.trackEncoder.paintLed();
            return;
        }
        this.bus.send(
            new PaintEncoder(TwisterRcGeometry.positionForSlot(slot), this.exists[slot] ? RC_COLOR : 0)
        );
    }

    private void paintRing(int slot) {
        if (!isActive()) return;
        if (slot == SelectedTrackEncoder.SLOT) {
            this.trackEncoder.paintRing();
            return;
        }
        this.bus.send(
            new SetEncoderValue(
                TwisterRcGeometry.positionForSlot(slot),
                (int) Math.round(this.values[slot] * 127.0)
            )
        );
    }

    private void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        for (int slot = 0; slot < SLOT_COUNT; slot++)
            this.paintRing(slot);
    }

    private void activate() {
        if (!isActive()) return;
        this.paint();
        this.paintRings();
    }

    public void on(Event event) {
        if (this.trackEncoder.track(event) && isActive())
            this.trackEncoder.paint();
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> {
                var next = new HashSet<Integer>();
                this.collectSelectable(schema, next);
                this.selectableTrackIds = next;
            }
            case BitwigTrackSelected(int id) -> {
                this.borrowed = false;
                this.trackSelected = this.isSelectable(id);
                this.activate();
            }
            case RequestSelectTrack(int trackId, String name) -> {
                if (this.isSelectable(trackId)) {
                    this.borrowed = false;
                    this.trackSelected = true;
                    this.activate();
                } else {
                    this.trackSelected = false;
                }
            }
            case DeviceGrabbed(String name) -> this.borrowed = true;
            case RequestFxSelectTrack(int id, String name) -> this.borrowed = true;
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (isActive()) this.activate();
            }
            case TrackRcValueChanged(int slot, double v) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.values[slot] = v;
                this.paintRing(slot);
            }
            case TrackRcExistsChanged(int slot, boolean e) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.exists[slot] = e;
                this.paintLed(slot);
            }
            case TrackRcNameChanged(int slot, String name) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.names[slot] = name;
            }
            case EncoderButtonPressed(int n) -> {
                if (!isActive()) return;
                if (n == SelectedTrackEncoder.POSITION) {
                    this.trackEncoder.press();
                    return;
                }
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0 || !this.exists[slot] || this.names[slot] == null) return;
                this.bus.send(new TrackRcEncoderPressed(this.names[slot]));
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                if (n == SelectedTrackEncoder.POSITION) {
                    this.trackEncoder.turn(v);
                    return;
                }
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0) return;
                this.bus.send(new SetTrackRcValue(slot, (double) v / 127.0));
            }
            default -> { }
        }
    }
}
