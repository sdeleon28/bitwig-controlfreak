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
    int channelIndex;
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
    boolean cacheDirty = false;

    protected BitwigSchemaTracker(ControllerHost host, EventBus bus) {
        this.host = host;
        this.bus = bus;
        this.mainTrackBank = host.createTrackBank(TRACKS_COUNT, FX_TRACKS_COUNT, SCENES_COUNT);
        for (int i = 0; i < TRACKS_COUNT; i++) {
            rawCache[i] = new TrackCache();
            rawCache[i].id = i;
            final int j = i;
            Track t = getTrack(i);
            t.exists().addValueObserver(v -> {
                rawCache[j].exists = v;
                cacheDirty = true;
            });
            t.name().addValueObserver(v -> {
                rawCache[j].name = v;
                cacheDirty = true;
            });
            t.isGroup().addValueObserver(v -> {
                rawCache[j].isGroup = v;
                cacheDirty = true;
            });
            t.mute().addValueObserver(v -> {
                rawCache[j].mute = v;
                cacheDirty = true;
            });
            t.solo().addValueObserver(v -> {
                rawCache[j].solo = v;
                cacheDirty = true;
            });
            t.trackType().addValueObserver(v -> {
                rawCache[j].trackType = v;
                cacheDirty = true;
            });
            t.channelIndex().addValueObserver(v -> {
                rawCache[j].channelIndex = v;
                cacheDirty = true;
            });
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
        bt.mute = t.mute;
        bt.solo = t.solo;
        bt.channelIndex = t.channelIndex;
        bt.depth = 0; // TODO
        bt.children = new ArrayList<BitwigTrack>(); // TODO
        return bt;
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
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
            ) {
                if (ids.contains(t.id)) {
                    BitwigTrack newTrack = cacheToTrackDef(t);
                    BitwigTrack oldTrack = tracks.get(t.id);
                    if (!newTrack.equals(oldTrack)) {
                        tracks.set(i, newTrack);
                        schemaDirty = true;
                    }
                }
                else {
                    tracks.add(cacheToTrackDef(t));
                    schemaDirty = true;
                }
            }
        }
        if (schemaDirty)
            this.bus.send(new SchemaChanged(this.tracks));
        this.cacheDirty = false;
    }
}
