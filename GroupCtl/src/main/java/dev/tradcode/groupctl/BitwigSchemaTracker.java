package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

class TrackCache {
    boolean exists;
    Integer id;
    String name;
    boolean isGroup;
    boolean mute;
    boolean solo;
    String trackType;
}

public class BitwigSchemaTracker {
    int TRACKS_COUNT = 64;
    int FX_TRACKS_COUNT = 8;
    // I'm not sure about this one
    int SCENES_COUNT = 0; 

    ControllerHost host;
    EventBus bus;
    TrackBank mainTrackBank;
    TrackCache[] rawCache = new TrackCache[TRACKS_COUNT];
    ArrayList<BitwigTrack> tracks = new ArrayList<BitwigTrack>();
    ArrayList<Integer> trackDepths;

    protected BitwigSchemaTracker(ControllerHost host, EventBus bus) {
        this.host = host;
        this.bus = bus;
        this.mainTrackBank = host.createTrackBank(TRACKS_COUNT, FX_TRACKS_COUNT, SCENES_COUNT);
        for (int i = 0; i < TRACKS_COUNT; i++) {
            rawCache[i] = new TrackCache();
            final int j = i;
            Track t = getTrack(i);
            t.exists().addValueObserver(v -> rawCache[j].exists = v);
            t.name().addValueObserver(v -> rawCache[j].name = v);
            t.isGroup().addValueObserver(v -> rawCache[j].isGroup = v);
            t.mute().addValueObserver(v -> rawCache[j].mute = v);
            t.solo().addValueObserver(v -> rawCache[j].solo = v);
            t.trackType().addValueObserver(v -> rawCache[j].trackType = v);
        }
    }

    private Track getTrack(int id) {
        return mainTrackBank.getItemAt(id);
    }

    private BitwigTrack cacheToTrackDef(TrackCache t) {
        BitwigTrack bt = new BitwigTrack();
        bt.id = t.id;
        bt.name = t.name;
        bt.isGroup = t.isGroup;
        bt.depth = 0; // TODO
        bt.children = new ArrayList<BitwigTrack>(); // TODO
        return bt;
    }

    public void flush() {
        // TODO: in case this gets hammered, it might be better to have a separate cacheDirty field
        // that indicates whether there have been updates to the raw cache. schemaDirty is about
        // the structured cache.
        boolean schemaDirty = false;
        List<Integer> ids = tracks
            .stream()
            .map(t -> t.id)
            .collect(Collectors.toList());
        for (int i = 0; i < TRACKS_COUNT; i++) {
            TrackCache t = rawCache[i];
            if (
                t.exists
                && t.trackType != "Master"
                && t.trackType != "Effect"
                && !ids.contains(t.id)
            ) {
                tracks.add(cacheToTrackDef(t));
                schemaDirty = true;
            }
            // TODO: when id.contains(t.id) and tracks aren't identical, replace
        }
        if (schemaDirty) {
            this.bus.send(new SchemaChanged(this.tracks));
        }
    }
}
