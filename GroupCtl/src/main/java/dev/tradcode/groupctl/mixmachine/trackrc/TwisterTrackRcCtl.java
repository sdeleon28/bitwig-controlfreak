package dev.tradcode.groupctl.mixmachine.trackrc;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
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
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.SetTrackRcValue;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcNameChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcValueChanged;

/**
 * Twister program: the bottom 8 encoders (positions 1..8) show and edit the
 * first page of the selected track's remote controls. Activation follows the
 * selection of a plain (non-group) track; selecting a group hands the encoders
 * back to the vol/pan overview, and — like every other twister program — a
 * device selection or the "selected track, then FX" gesture borrows them.
 */
public class TwisterTrackRcCtl implements IEventBusSubscriber {
    static int RC_COUNT = 8;
    static int RC_COLOR = 19; // twister blinding cyan, mirrors the master/device RCs

    IEventBus bus;
    Set<Integer> selectableTrackIds = new HashSet<>();
    boolean trackSelected = false;
    boolean editorPageActive = false;
    boolean borrowed = false; // a device or the send-to-all-fx program took the encoders
    double[] values = new double[RC_COUNT];
    boolean[] exists = new boolean[RC_COUNT];
    String[] names = new String[RC_COUNT];

    Map<Integer, Integer> POSITIONS_TO_IDS = Map.ofEntries(
        Map.entry(1, 4), Map.entry(2, 5), Map.entry(3, 6), Map.entry(4, 7),
        Map.entry(5, 0), Map.entry(6, 1), Map.entry(7, 2), Map.entry(8, 3)
    );

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

    private int positionToId(int n) {
        return POSITIONS_TO_IDS.getOrDefault(n, -1);
    }

    private int idToPosition(int id) {
        var reversed = new HashMap<Integer, Integer>();
        POSITIONS_TO_IDS.forEach((k, v) -> reversed.put(v, k));
        return reversed.getOrDefault(id, -1);
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
        for (int id = 0; id < RC_COUNT; id++)
            this.paintLed(id);
    }

    private void paintLed(int id) {
        if (!isActive()) return;
        this.bus.send(
            new PaintEncoder(this.idToPosition(id), this.exists[id] ? RC_COLOR : 0)
        );
    }

    private void paintRing(int id) {
        if (!isActive()) return;
        this.bus.send(
            new SetEncoderValue(
                this.idToPosition(id),
                (int) Math.round(this.values[id] * 127.0)
            )
        );
    }

    private void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        for (int id = 0; id < RC_COUNT; id++)
            this.paintRing(id);
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
            case RequestSelectDevice(int n) -> this.borrowed = true;
            case RequestFxSelectTrack(int id, String name) -> this.borrowed = true;
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (isActive()) this.activate();
            }
            case TrackRcValueChanged(int id, double v) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.values[id] = v;
                this.paintRing(id);
            }
            case TrackRcExistsChanged(int id, boolean e) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.exists[id] = e;
                this.paintLed(id);
            }
            case TrackRcNameChanged(int id, String name) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.names[id] = name;
            }
            case EncoderButtonPressed(int n) -> {
                if (!isActive()) return;
                int id = this.positionToId(n);
                if (id < 0 || !this.exists[id] || this.names[id] == null) return;
                this.bus.send(new TrackRcEncoderPressed(this.names[id]));
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                int id = this.positionToId(n);
                if (id < 0) return;
                this.bus.send(new SetTrackRcValue(id, (double) v / 127.0));
            }
            default -> { }
        }
    }
}
