package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigFxTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.FxSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadMode;
import dev.tradcode.groupctl.events.PadModeUpdated;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestFxToggleMute;
import dev.tradcode.groupctl.events.RequestFxToggleRec;
import dev.tradcode.groupctl.events.RequestFxToggleSolo;
import dev.tradcode.groupctl.events.RequestSelectTrack;

public class LaunchpadFxCtl implements IEventBusSubscriber {
    static int FX_TRACKS_COUNT = 8;

    IEventBus bus;
    ArrayList<BitwigTrack> fxTracks = new ArrayList<>();
    Map<Integer, Integer> GLOBAL_TO_LOCAL = Map.ofEntries(
        Map.entry(55, 0),
        Map.entry(56, 1),
        Map.entry(57, 2),
        Map.entry(58, 3),
        Map.entry(65, 4),
        Map.entry(66, 5),
        Map.entry(67, 6),
        Map.entry(68, 7)
    );
    PadMode mode = PadMode.SELECT;
    boolean pageActive = true;
    boolean applicable = false;
    int selectedFxTrackId = -1;

    public LaunchpadFxCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.paint();
    }

    private int globalToLocalPosition(int gpos) {
        if (gpos == -1) return -1;
        return GLOBAL_TO_LOCAL.getOrDefault(gpos, -1);
    }

    private int localToGlobalPosition(int pos) {
        if (pos == -1) return -1;
        var reversed = new HashMap<Integer, Integer>();
        GLOBAL_TO_LOCAL.forEach((k, v) -> reversed.put(v, k));
        return reversed.getOrDefault(pos, -1);
    }

    private void clear() {
        for (int i = 0; i < FX_TRACKS_COUNT; i++) {
            var pos = this.localToGlobalPosition(i);
            if (pos == -1)
                continue;
            this.bus.send(new PaintPad(pos, 0));
        }
    }

    private int bwToLaunchpadColor(String bwColor) {
        return Colors.toLaunchpad(bwColor);
    }

    protected void paint() {
        if (!this.pageActive) return;
        this.clear();
        if (!this.applicable || this.fxTracks.size() == 0) return;
        for (int i = 0; i < this.fxTracks.size(); i++) {
            var t = this.fxTracks.get(i);
            var pos = this.localToGlobalPosition(t.id);
            var color = this.bwToLaunchpadColor(t.color);
            if (this.mode == PadMode.MUTE && t.mute)
                color = MixMachineColors.MUTE_COLOR;
            if (this.mode == PadMode.SOLO && t.solo)
                color = MixMachineColors.SOLO_COLOR;
            if (this.mode == PadMode.REC && t.rec)
                color = MixMachineColors.REC_COLOR;
            if (pos != -1 && color != -1)
                this.bus.send(
                    t.id == this.selectedFxTrackId ?
                          new BlinkPad(pos, color)
                        : new PaintPad(pos, color)
                );
        }
    }

    public void performTrackAction(int id, String name) {
        switch (mode) {
            case PadMode.MUTE:
                this.bus.send(new RequestFxToggleMute(id, name));
                break;
            case PadMode.SOLO:
                this.bus.send(new RequestFxToggleSolo(id, name));
                break;
            case PadMode.REC:
                this.bus.send(new RequestFxToggleRec(id, name));
                break;
            default:
                this.bus.send(new RequestFxSelectTrack(id, name));
        }
    }

    public void on(Event event) {
        switch (event) {
            case FxSchemaChanged(ArrayList<BitwigTrack> fxTracks) -> {
                if (this.fxTracks.equals(fxTracks)) return;
                this.fxTracks = fxTracks;
                this.paint();
            }
            case PadModeUpdated(var mode) -> {
                this.mode = mode;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            case BitwigFxTrackSelected(int id) -> {
                this.selectedFxTrackId = id;
                this.paint();
            }
            case RequestFxSelectTrack(int id, String name) -> {
                this.selectedFxTrackId = id;
                this.paint();
            }
            case BitwigTrackSelected(int id) -> {
                this.selectedFxTrackId = -1;
                this.applicable = true;
                this.paint();
            }
            case RequestSelectTrack(int trackId, String name) -> {
                this.selectedFxTrackId = -1;
                this.applicable = true;
                this.paint();
            }
            case RequestSelectDevice(int n) -> {
                this.applicable = false;
                this.paint();
            }
            case PadClicked(int n) when this.pageActive && this.applicable -> {
                var id = this.globalToLocalPosition(n);
                if (id == -1) return;
                var trackName = this.fxTracks.get(id).name;
                if (trackName != null)
                    this.performTrackAction(id, trackName);
            }
            default -> { }
        }
    }
}
