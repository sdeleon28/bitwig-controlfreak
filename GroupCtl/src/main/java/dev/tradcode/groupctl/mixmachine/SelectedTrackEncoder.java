package dev.tradcode.groupctl.mixmachine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.RequestToggleSolo;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.TrackEncoderPressed;
import dev.tradcode.groupctl.events.VolModeSelected;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;

/**
 * Encoder 16 of the RC programs: the selected track's volume (or pan in pan
 * mode), lit in the track's color, pressing it toggles solo. The owning program
 * feeds it every event and decides when it may paint or take input.
 */
public class SelectedTrackEncoder {
    public static final int POSITION = 16;
    public static final int SLOT = TwisterRcGeometry.slotForPosition(POSITION);
    static final int SOLO_COLOR = 66;

    IEventBus bus;
    Map<Integer, BitwigTrack> tracksById = new HashMap<>();
    int selectedTrackId = -1;
    boolean panMode = false;

    public SelectedTrackEncoder(IEventBus bus) {
        this.bus = bus;
    }

    /** Returns true when what encoder 16 shows changed and should be repainted. */
    public boolean track(Event event) {
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> {
                this.tracksById = new HashMap<>();
                this.collect(schema);
                return true;
            }
            case BitwigTrackSelected(int id) -> this.selectedTrackId = id;
            case RequestSelectTrack(int id, String name) -> this.selectedTrackId = id;
            case VolumeUpdated(int id, double v) -> {
                return this.levelUpdated(id, v, false);
            }
            case PanUpdated(int id, double v) -> {
                return this.levelUpdated(id, v, true);
            }
            case VolModeSelected() -> {
                this.panMode = false;
                return true;
            }
            case PanModeSelected() -> {
                this.panMode = true;
                return true;
            }
            default -> { }
        }
        return false;
    }

    public void paintLed() {
        var t = this.selected();
        if (t != null)
            this.bus.send(new PaintEncoder(POSITION, t.solo ? SOLO_COLOR : Colors.toTwister(t.color)));
    }

    public void paintRing() {
        var t = this.selected();
        if (t != null)
            this.bus.send(new SetEncoderValue(POSITION, (int) Math.round((this.panMode ? t.pan : t.volume) * 127.0)));
    }

    public void paint() {
        this.paintLed();
        this.paintRing();
    }

    public void turn(int v) {
        var t = this.selected();
        if (t != null)
            this.bus.send(this.panMode ? new SetTrackPan(t.id, v / 127.0) : new SetTrackVolume(t.id, v / 127.0));
    }

    public void press() {
        var t = this.selected();
        if (t != null)
            this.bus.send(new RequestToggleSolo(t.id, t.name), new TrackEncoderPressed(t.name));
    }

    private BitwigTrack selected() {
        return this.tracksById.get(this.selectedTrackId);
    }

    private void collect(ArrayList<BitwigTrack> tracks) {
        for (var t : tracks) {
            this.tracksById.put(t.id, t);
            this.collect(t.children);
        }
    }

    private boolean levelUpdated(int id, double v, boolean isPan) {
        var t = this.tracksById.get(id);
        if (t == null) return false;
        if (isPan) t.pan = v; else t.volume = v;
        return id == this.selectedTrackId && isPan == this.panMode;
    }
}
