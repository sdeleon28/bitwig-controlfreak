package dev.tradcode.groupctl.mixmachine;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.RequestClearMute;
import dev.tradcode.groupctl.events.RequestClearRec;
import dev.tradcode.groupctl.events.RequestClearSolo;
import dev.tradcode.groupctl.events.SideButtonLongPressed;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;

public class ClearActionsCtl implements IEventBusSubscriber {
    IEventBus bus;
    List<BitwigTrack> tracks = new ArrayList<>();
    boolean pageActive = true;

    public ClearActionsCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isRefGroup(BitwigTrack t) {
        return t.isGroup
            && t.name != null
            && t.name.toLowerCase().startsWith("top refs");
    }

    // Mirrors the JS clearAllMute: skip any "top refs" group and everything
    // nested under it, so reference tracks stay muted.
    private void collectMutedSkippingRefs(List<BitwigTrack> tracks, List<Integer> out) {
        for (var t : tracks) {
            if (isRefGroup(t)) continue;
            if (t.mute) out.add(t.id);
            collectMutedSkippingRefs(t.children, out);
        }
    }

    private List<Integer> mutedNonRefIds() {
        var out = new ArrayList<Integer>();
        collectMutedSkippingRefs(this.tracks, out);
        return out;
    }

    private List<Integer> idsWhere(Predicate<BitwigTrack> keep) {
        return flatten(this.tracks).stream()
            .filter(keep)
            .map(t -> t.id)
            .toList();
    }

    private List<BitwigTrack> flatten(List<BitwigTrack> tracks) {
        var res = new ArrayList<BitwigTrack>();
        for (var t : tracks) {
            res.add(t);
            res.addAll(flatten(t.children));
        }
        return res;
    }

    public void on(Event event) {
        switch (event) {
            case SchemaChanged(var schema) -> this.tracks = schema;
            case PageSelected(int n) -> this.pageActive = n == 0;
            case SideButtonLongPressed(var btn) when this.pageActive -> {
                switch (btn) {
                    case MUTE -> this.bus.send(new RequestClearMute(mutedNonRefIds()));
                    case SOLO -> this.bus.send(new RequestClearSolo(idsWhere(t -> t.solo)));
                    case RECORD_ARM -> this.bus.send(new RequestClearRec(idsWhere(t -> t.rec)));
                    default -> { }
                }
            }
            default -> { }
        }
    }
}
