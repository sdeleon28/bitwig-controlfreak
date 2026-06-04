package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectGroup;
import dev.tradcode.groupctl.events.SchemaChanged;

public class GroupCtl implements IEventBusSubscriber {
    IEventBus bus;
    ArrayList<BitwigTrack> schema;
    int selectedGroupId = -1;
    boolean pageActive = true; // TODO
    Map<Integer, Integer> GLOBAL_TO_LOCAL = Map.ofEntries(
        // row 1
        Map.entry(15, 1),  Map.entry(16, 2),
        Map.entry(17, 3),  Map.entry(18, 4),
        // row 2
        Map.entry(25, 5),  Map.entry(26, 6),
        Map.entry(27, 7),  Map.entry(28, 8),
        // row 3
        Map.entry(35, 9),  Map.entry(36, 10),
        Map.entry(37, 11), Map.entry(38, 12),
        // row 4
        Map.entry(45, 13), Map.entry(46, 14),
        Map.entry(47, 15), Map.entry(48, 16)
    );

    public GroupCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private ArrayList<BitwigTrack> flatten(ArrayList<BitwigTrack> tracks) {
        ArrayList<BitwigTrack> res = new ArrayList<>();
        if (tracks.size() == 0) return res;
        for (var t : tracks) {
            res.add(t);
            res.addAll(this.flatten(t.children));
        }
        return res;
    }

    private List<BitwigTrack> getGroups() {
        return this.flatten(this.schema)
            .stream()
            .filter(t -> t.isGroup)
            .toList();
    }

    private int trackIdToPosition(int id) {
        return this.getGroups()
            .stream()
            .filter(t -> t.id == id)
            .findFirst()
            .map(t -> t.getPosition())
            .orElse(-1);
    }

    private int trackPositionToId(int pos) {
        return this.getGroups()
            .stream()
            .filter(t -> t.getPosition() == pos)
            .findFirst()
            .map(t -> t.id)
            .orElse(-1);
    }

    private String trackPositionToName(int pos) {
        return this.getGroups()
            .stream()
            .filter(t -> t.getPosition() == pos)
            .findFirst()
            .map(t -> t.name)
            .orElse(null);
    }

    private int globalToLocalPosition(int gpos) {
        if (gpos == -1) return -1;
        return GLOBAL_TO_LOCAL.get(gpos);
    }

    private int localToGlobalPosition(int pos) {
        if (pos == -1) return -1;
        var reversed = new HashMap<Integer, Integer>();
        GLOBAL_TO_LOCAL.forEach((k, v) -> reversed.put(v, k));
        return reversed.get(pos);
    }

    private int bwToLaunchpadColor(String bwColor) {
        return Colors.toLaunchpad(bwColor);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        for (var gt : this.getGroups()) {
            var pos = this.localToGlobalPosition(gt.getPosition());
            var color = this.bwToLaunchpadColor(gt.color);
            if (pos != -1 && color != -1)
                // TODO: blink distinction
                this.bus.send(
                    new PaintPad(pos, color)
                );
        }
    }

    public void on(Event event) {
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> {
                this.schema = schema;
                this.paint();
            }
            case PadClicked(int n) when this.pageActive -> {
                var pos = this.globalToLocalPosition(n);
                if (pos != -1) {
                    var trackId = this.trackPositionToId(n);
                    var trackName = this.trackPositionToName(n);
                    if (trackId != -1 && trackName != null)
                        this.bus.send(
                            new RequestSelectGroup(
                                trackId,
                                trackName
                            )
                        );
                }
            }
            case BitwigTrackSelected(int trackId) -> {
                this.selectedGroupId = trackId;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            default -> { }
        }
    }
}
