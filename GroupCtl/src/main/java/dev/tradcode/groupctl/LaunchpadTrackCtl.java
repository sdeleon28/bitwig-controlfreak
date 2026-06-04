package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectTrack;

class LaunchpadTrackCtl extends TrackCtl {
    boolean pageActive = true;

    Map<Integer, Integer> GLOBAL_TO_LOCAL = Map.ofEntries(
        // row 1
        Map.entry(11, 1),  Map.entry(12, 2),
        Map.entry(13, 3),  Map.entry(14, 4),
        // row 2
        Map.entry(21, 5),  Map.entry(22, 6),
        Map.entry(23, 7),  Map.entry(24, 8),
        // row 3
        Map.entry(31, 9),  Map.entry(32, 10),
        Map.entry(33, 11), Map.entry(34, 12),
        // row 4
        Map.entry(41, 13), Map.entry(42, 14),
        Map.entry(43, 15), Map.entry(44, 16)
    );

    public LaunchpadTrackCtl(IEventBus bus) {
        super(bus);
    }

    private List<BitwigTrack> getGroups() {
        return this.flatten(this.tracks)
            .stream()
            .filter(t -> t.isGroup)
            .toList();
    }

    private List<BitwigTrack> tracksInSelectedGroup() {
        return this.getGroups()
            .stream()
            .filter(g -> g.id == this.selectedGroupId)
            .findFirst()
            .map(g -> g.children)
            .orElse(new ArrayList<>());
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

    private void clearQuadrant() {
        for (int i = 1; i <= 16; i++) {
            var pos = this.localToGlobalPosition(i);
            if (pos == -1)
                continue;
            this.bus.send(new PaintPad(pos, 0));
        }
    }

    private int bwToLaunchpadColor(String bwColor) {
        return Colors.toLaunchpad(bwColor);
    }

    @Override
    protected void paint() {
        if (!this.pageActive)
            return;
        this.clearQuadrant();
        var inGroup = this.tracksInSelectedGroup();
        for (var t : inGroup) {
            var pos = this.localToGlobalPosition(t.getPosition());
            var color = this.bwToLaunchpadColor(t.color);
            if (pos != -1 && color != -1)
                this.bus.send(
                    t.id == this.selectedTrackId ?
                          new BlinkPad(pos, color)
                        : new PaintPad(pos, color)
                );
        }
    }

    private int trackPositionToId(int pos) {
        return this.tracksInSelectedGroup()
            .stream()
            .filter(t -> t.getPosition() == pos)
            .findFirst()
            .map(t -> t.id)
            .orElse(-1);
    }

    private String trackPositionToName(int pos) {
        return this.tracksInSelectedGroup()
            .stream()
            .filter(t -> t.getPosition() == pos)
            .findFirst()
            .map(t -> t.name)
            .orElse(null);
    }

    public void on(Event event) {
        super.on(event);
        switch (event) {
            case PadClicked(int n) when this.pageActive -> {
                var pos = this.globalToLocalPosition(n);
                if (pos != -1) {
                    var trackId = this.trackPositionToId(pos);
                    var trackName = this.trackPositionToName(pos);
                    if (trackId != -1 && trackName != null)
                        this.bus.send(
                            new RequestSelectTrack(
                                trackId,
                                trackName
                            )
                        );
                }
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            default -> { }
        }
    }
}
