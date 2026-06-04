package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.SchemaChanged;
import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;


public abstract class TrackCtl implements IEventBusSubscriber {
    IEventBus bus;
    ArrayList<BitwigTrack> tracks = new ArrayList<>();
    int selectedTrackId = -1;
    int selectedGroupId = -1;

    public TrackCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private List<BitwigTrack> getGroups() {
        return this.flatten(this.tracks)
            .stream()
            .filter(t -> t.isGroup)
            .toList();
    }

    protected List<BitwigTrack> tracksInSelectedGroup() {
        return this.getGroups()
            .stream()
            .filter(g -> g.id == this.selectedGroupId)
            .findFirst()
            .map(g -> g.children)
            .orElse(new ArrayList<>());
    }

    protected ArrayList<BitwigTrack> flatten(ArrayList<BitwigTrack> tracks) {
        ArrayList<BitwigTrack> res = new ArrayList<>();
        if (tracks.size() == 0) return res;
        for (var t : tracks) {
            res.add(t);
            res.addAll(this.flatten(t.children));
        }
        return res;
    }

    private BitwigTrack getTrackById(int id) {
        return this.flatten(this.tracks)
            .stream()
            .filter(t -> t.id == id)
            .findFirst()
            .orElse(null);
    }

    protected abstract void paint();

    public void on(Event event) {
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> {
                if (!this.tracks.equals(schema)) {
                    this.tracks = schema;
                    this.paint();
                }
            }
            case BitwigTrackSelected(int id) -> {
                this.selectedTrackId = id;
                var track = this.getTrackById(id);
                if (track != null && track.isGroup) {
                    this.selectedGroupId = id;
                    this.paint();
                }
            }
            default -> { }
        }
    }
}
