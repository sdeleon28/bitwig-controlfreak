package dev.tradcode.groupctl.mixmachine;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.SchemaChanged;
import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.RequestSetSolo;
import dev.tradcode.groupctl.events.RequestToggleMute;
import dev.tradcode.groupctl.events.RequestToggleRec;
import dev.tradcode.groupctl.events.RequestToggleSolo;

class TrackCache {
    boolean exists;
    Integer id;
    String name;
    boolean isGroup;
    boolean mute;
    boolean solo;
    boolean rec;
    String trackType;
    int channelIndex;
    String color = "";
    boolean isSelectedInEditor;
    boolean isSelectedInMixer;
    int position;
    double volume;
    double pan;
}

public class BitwigSchemaTracker implements IEventBusSubscriber {
    int TRACKS_COUNT = 64;
    // this probably needs to be 0
    int FX_TRACKS_COUNT = 8;
    // I'm not sure about this one
    int SCENES_COUNT = 0; 

    ControllerHost host;
    IEventBus bus;
    TrackBank mainTrackBank;
    TrackCache[] rawCache = new TrackCache[TRACKS_COUNT];
    ArrayList<BitwigTrack> flatTracks = new ArrayList<BitwigTrack>();
    boolean cacheDirty = false;

    public TrackBank getTrackBank() {
        return this.mainTrackBank;
    }

    protected BitwigSchemaTracker(ControllerHost host, IEventBus bus) {
        this.host = host;
        this.bus = bus;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
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
            t.arm().addValueObserver(v -> {
                rawCache[j].rec = v;
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
            t.color().addValueObserver((r, g, b) -> {
                // Quantize each channel to the nearest even value, mirroring the JS
                // impl's `(r >> 1 << 1)` in findClosestColorIndex ("quantized to even
                // to absorb rounding"). float->255 rounding can land on 217 where the
                // palette key is 216; clearing the low bit makes that difference moot,
                // so the palette tables don't need re-mapping.
                int r255 = (int) Math.round(r * 255.0) & ~1;
                int g255 = (int) Math.round(g * 255.0) & ~1;
                int b255 = (int) Math.round(b * 255.0) & ~1;
                rawCache[j].color = r255 + "," + g255 + "," + b255;
                cacheDirty = true;
            });
            t.addIsSelectedInEditorObserver(v -> {
                rawCache[j].isSelectedInEditor = v;
                cacheDirty = true;
            });
            t.addIsSelectedInMixerObserver(v -> {
                if (!rawCache[j].isSelectedInMixer && v)
                    this.bus.send(new BitwigTrackSelected(rawCache[j].id));
                rawCache[j].isSelectedInMixer = v;
                cacheDirty = true;
            });
            t.volume().value().addValueObserver(v -> {
                // store the volume but don't publish a full schema over it
                rawCache[j].volume = v;
            });
            t.pan().value().addValueObserver(v -> {
                // store the pan but don't publish a full schema over it
                rawCache[j].pan = v;
            });
        }
    }

    public void on(Event event) {
        switch (event) {
            case RequestToggleMute(int id, String trackName) ->
                getTrack(id).mute().toggle();
            case RequestToggleSolo(int id, String trackName) ->
                getTrack(id).solo().toggle();
            case RequestSetSolo(int id, String trackName, boolean solo) ->
                getTrack(id).solo().set(solo);
            case RequestToggleRec(int id, String trackName) ->
                getTrack(id).arm().toggle();
            case RequestSelectTrack(int trackId, String trackName) -> {
                var track = getTrack(trackId);
                track.selectInMixer();
                track.makeVisibleInMixer();
                track.selectInEditor();
                track.makeVisibleInArranger();
            }
            default -> { }
        }
    }

    /**
     * For testing. Don't use this.
     */
    public void _setRawTrackCache(int id, TrackCache t) {
        this.rawCache[id] = t;
        this.cacheDirty = true;
    }

    public Track getTrack(int id) {
        return mainTrackBank.getItemAt(id);
    }

    private ArrayList<BitwigTrack> getStructuredTracks() {
        return this.getStructuredTracks(this.flatTracks);
    }

    private ArrayList<BitwigTrack> getStructuredTracks(List<BitwigTrack> tracks) {
        if (tracks.size() == 0)
            return new ArrayList<BitwigTrack>();

        ArrayList<BitwigTrack> res = new ArrayList<BitwigTrack>();

        BitwigTrack nextTrack = tracks.get(0);

        if (tracks.size() == 1) {
            res.add(nextTrack);
            return res;
        }

        if (!nextTrack.isGroup) {
            res.add(nextTrack);
            res.addAll(getStructuredTracks(tracks.subList(1, tracks.size())));
            return res;
        }

        int boundary = tracks.size();
        boolean topGroup = nextTrack.name.startsWith("top");
        for (int i = 1; i < tracks.size(); i++) {
            BitwigTrack t = tracks.get(i);
            boolean isNextSibling = topGroup
                ? (t.isGroup && t.name.startsWith("top"))
                : t.isGroup;
            if (isNextSibling) {
                boundary = i;
                break;
            }
        }

        nextTrack.children = getStructuredTracks(tracks.subList(1, boundary));
        res.add(nextTrack);
        if (boundary != tracks.size()) {
            res.addAll(getStructuredTracks(tracks.subList(boundary, tracks.size())));
        }
        return res;
    }

    // if you touch this, you probably wanna do the same in BitwigFxTracker
    private BitwigTrack cacheToTrackDef(TrackCache t) {
        BitwigTrack bt = new BitwigTrack();
        bt.id = t.id;
        bt.name = t.name;
        bt.isGroup = t.isGroup;
        bt.mute = t.mute;
        bt.solo = t.solo;
        bt.rec = t.rec;
        bt.channelIndex = t.channelIndex;
        bt.color = t.color;
        bt.isSelectedInEditor = t.isSelectedInEditor;
        bt.isSelectedInMixer = t.isSelectedInMixer;
        bt.volume = t.volume;
        bt.pan = t.pan;
        bt.depth = 0; // TODO
        bt.children = new ArrayList<BitwigTrack>(); // TODO
        return bt;
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
        boolean schemaDirty = false;
        List<Integer> ids = flatTracks
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
                    BitwigTrack oldTrack = flatTracks.get(t.id);
                    if (!newTrack.equals(oldTrack)) {
                        flatTracks.set(i, newTrack);
                        schemaDirty = true;
                    }
                }
                else {
                    flatTracks.add(cacheToTrackDef(t));
                    schemaDirty = true;
                }
            }
        }
        if (schemaDirty)
            this.bus.send(new SchemaChanged(getStructuredTracks()));
        this.cacheDirty = false;
    }
}
