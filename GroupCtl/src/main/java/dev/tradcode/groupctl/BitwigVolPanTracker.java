package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.VolumeUpdated;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PanUpdated;
import dev.tradcode.groupctl.events.SetTrackVolume;

class TrackVolumeCache {
    boolean exists;
    Integer id;
    String name;
    int channelIndex;
    double volume;
    double pan;
    boolean volumeDirty;
    boolean panDirty;
}

public class BitwigVolPanTracker implements IEventBusSubscriber {
    int TRACKS_COUNT = 64;
    int FX_TRACKS_COUNT = 8;
    // I'm not sure about this one
    int SCENES_COUNT = 0; 

    ControllerHost host;
    IEventBus bus;
    TrackBank mainTrackBank;
    TrackVolumeCache[] rawCache = new TrackVolumeCache[TRACKS_COUNT];

    protected BitwigVolPanTracker(ControllerHost host, IEventBus bus) {
        this.host = host;
        this.bus = bus;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.mainTrackBank = host.createTrackBank(TRACKS_COUNT, FX_TRACKS_COUNT, SCENES_COUNT);
        for (int i = 0; i < TRACKS_COUNT; i++) {
            rawCache[i] = new TrackVolumeCache();
            rawCache[i].id = i;
            final int j = i;
            Track t = getTrack(i);
            t.exists().addValueObserver(v -> {
                rawCache[j].exists = v;
            });
            t.name().addValueObserver(v -> {
                rawCache[j].name = v;
            });
            t.channelIndex().addValueObserver(v -> {
                rawCache[j].channelIndex = v;
            });
            t.volume().value().addValueObserver(v -> {
                rawCache[j].volume = v;
                rawCache[j].volumeDirty = true;
            });
            t.pan().value().addValueObserver(v -> {
                rawCache[j].pan = v;
                rawCache[j].panDirty = true;
            });
        }
    }

    public void on(Event event) {
        switch (event) {
            case SetTrackVolume(int id, double v) -> {
                getTrack(id).volume().value().set(v);
            }
            default -> { }
        }
    }

    private Track getTrack(int id) {
        return mainTrackBank.getItemAt(id);
    }

    public void flush() {
        for (int i = 0; i < rawCache.length; i++) {
            var t = rawCache[i];
            if (t.volumeDirty) {
                this.bus.send(new VolumeUpdated(t.id, t.volume));
                t.volumeDirty = false;
            }
            if (t.panDirty) {
                this.bus.send(new PanUpdated(t.id, t.pan));
                t.panDirty = false;
            }
        }
    }
}
