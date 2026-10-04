package dev.tradcode.groupctl.mixmachine.trackrc;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.RequestToggleSolo;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.TrackEncoderPressed;
import dev.tradcode.groupctl.events.VolModeSelected;
import dev.tradcode.groupctl.mixmachine.TwisterRcGeometry;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;
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
 * "selected track, then FX" gesture borrows them.
 *
 * Encoder 16 is not an RC: it is the selected track's own volume (or pan in pan
 * mode), lit in the track's color, and pressing it toggles the track's solo.
 */
public class TwisterTrackRcCtl implements IEventBusSubscriber {
    static int SLOT_COUNT = TwisterRcGeometry.SLOT_COUNT;
    static int RC_COLOR = 19; // twister blinding cyan, mirrors the master/device RCs
    static int SOLO_COLOR = 66;
    static int TRACK_POSITION = 16;
    static int TRACK_SLOT = TwisterRcGeometry.slotForPosition(TRACK_POSITION);

    IEventBus bus;
    Set<Integer> selectableTrackIds = new HashSet<>();
    boolean trackSelected = false;
    boolean editorPageActive = false;
    boolean borrowed = false; // a device or the send-to-all-fx program took the encoders
    double[] values = new double[SLOT_COUNT];
    boolean[] exists = new boolean[SLOT_COUNT];
    String[] names = new String[SLOT_COUNT];
    Map<Integer, BitwigTrack> tracksById = new HashMap<>();
    int selectedTrackId = -1;
    boolean panMode = false;

    public TwisterTrackRcCtl(IEventBus bus) {
        this.bus = bus;
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
            this.tracksById.put(t.id, t);
            this.collectSelectable(t.children, out);
        }
    }

    private BitwigTrack selectedTrack() {
        return this.tracksById.get(this.selectedTrackId);
    }

    private void selectTrack(int id) {
        this.selectedTrackId = id;
        this.trackSelected = this.isSelectable(id);
    }

    private void paintTrackLed() {
        if (!isActive()) return;
        var t = this.selectedTrack();
        if (t == null) return;
        this.bus.send(new PaintEncoder(TRACK_POSITION, t.solo ? SOLO_COLOR : Colors.toTwister(t.color)));
    }

    private void paintTrackRing() {
        if (!isActive()) return;
        var t = this.selectedTrack();
        if (t == null) return;
        this.bus.send(new SetEncoderValue(TRACK_POSITION, (int) Math.round((this.panMode ? t.pan : t.volume) * 127.0)));
    }

    private void trackLevelUpdated(int id, double v, boolean isPan) {
        var t = this.tracksById.get(id);
        if (t == null) return;
        if (isPan) t.pan = v; else t.volume = v;
        if (id == this.selectedTrackId && isPan == this.panMode)
            this.paintTrackRing();
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
        if (slot == TRACK_SLOT) {
            this.paintTrackLed();
            return;
        }
        this.bus.send(
            new PaintEncoder(TwisterRcGeometry.positionForSlot(slot), this.exists[slot] ? RC_COLOR : 0)
        );
    }

    private void paintRing(int slot) {
        if (!isActive()) return;
        if (slot == TRACK_SLOT) {
            this.paintTrackRing();
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
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> {
                var next = new HashSet<Integer>();
                this.tracksById = new HashMap<>();
                this.collectSelectable(schema, next);
                this.selectableTrackIds = next;
                this.paintTrackLed();
                this.paintTrackRing();
            }
            case BitwigTrackSelected(int id) -> {
                this.borrowed = false;
                this.selectTrack(id);
                this.activate();
            }
            case RequestSelectTrack(int trackId, String name) -> {
                this.selectTrack(trackId);
                if (this.trackSelected) {
                    this.borrowed = false;
                    this.activate();
                }
            }
            case VolumeUpdated(int id, double v) -> this.trackLevelUpdated(id, v, false);
            case PanUpdated(int id, double v) -> this.trackLevelUpdated(id, v, true);
            case VolModeSelected() -> {
                this.panMode = false;
                this.paintTrackRing();
            }
            case PanModeSelected() -> {
                this.panMode = true;
                this.paintTrackRing();
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
                if (n == TRACK_POSITION) {
                    var t = this.selectedTrack();
                    if (t != null)
                        this.bus.send(new RequestToggleSolo(t.id, t.name), new TrackEncoderPressed(t.name));
                    return;
                }
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0 || !this.exists[slot] || this.names[slot] == null) return;
                this.bus.send(new TrackRcEncoderPressed(this.names[slot]));
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                if (n == TRACK_POSITION) {
                    var t = this.selectedTrack();
                    if (t != null)
                        this.bus.send(this.panMode
                            ? new SetTrackPan(t.id, v / 127.0)
                            : new SetTrackVolume(t.id, v / 127.0));
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
