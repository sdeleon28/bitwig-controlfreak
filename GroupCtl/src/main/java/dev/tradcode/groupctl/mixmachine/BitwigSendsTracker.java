package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigSend;
import dev.tradcode.groupctl.mixmachine.events.SendValueUpdated;
import dev.tradcode.groupctl.mixmachine.events.SendsChanged;
import dev.tradcode.groupctl.mixmachine.events.SetSelectedTrackSend;
import java.util.ArrayList;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.SendBank;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

class SendCache {
    boolean exists;
    Integer trackId;
    Integer id;
    String name;
    double value;
    boolean valueDirty;
}

public class BitwigSendsTracker implements IEventBusSubscriber {
    int TRACKS_COUNT = 64;
    int FX_TRACKS_COUNT = 8;
    int SCENES_COUNT = 0;
    int SENDS = 8;

    IEventBus bus;
    ControllerHost host;
    TrackBank mainTrackBank;
    SendCache[][] rawCache = new SendCache[TRACKS_COUNT][SENDS];
    boolean schemaDirty = false;

    public BitwigSendsTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
        for (int i = 0; i < TRACKS_COUNT; i++)
            for (int j = 0; j < SENDS; j++) {
                rawCache[i][j] = new SendCache();
                rawCache[i][j].trackId = i;
                rawCache[i][j].id = j;
            }
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.mainTrackBank = host.createTrackBank(TRACKS_COUNT, FX_TRACKS_COUNT, SCENES_COUNT);
        for (int i = 0; i < TRACKS_COUNT; i++) {
            Track t = getTrack(i);
            SendBank sendBank = t.sendBank();
            for (int j = 0; j < SENDS; j++) {
                final int ti = i;
                final int sj = j;
                var s = sendBank.getItemAt(j);
                s.exists().addValueObserver(v -> {
                    rawCache[ti][sj].exists = v;
                    schemaDirty = true;
                });
                s.name().addValueObserver(v -> {
                    rawCache[ti][sj].name = v;
                    schemaDirty = true;
                });
                s.value().addValueObserver(v -> {
                    rawCache[ti][sj].value = v;
                    rawCache[ti][sj].valueDirty = true;
                });
            }
        }
    }

    public Track getTrack(int id) {
        return mainTrackBank.getItemAt(id);
    }

    /**
     * For testing. Don't use this.
     */
    public void _setRawSendCache(int trackId, int sendId, SendCache s) {
        this.rawCache[trackId][sendId] = s;
        this.schemaDirty = true;
    }

    /**
     * For testing. Don't use this.
     */
    public void _setRawSendValue(int trackId, int sendId, double value) {
        this.rawCache[trackId][sendId].value = value;
        this.rawCache[trackId][sendId].valueDirty = true;
    }

    private BitwigSend cacheToSendDef(SendCache s) {
        BitwigSend bs = new BitwigSend();
        bs.trackId = s.trackId;
        bs.id = s.id;
        bs.exists = s.exists;
        bs.name = s.name;
        bs.value = s.value;
        return bs;
    }

    public void flush() {
        if (this.schemaDirty) {
            var defs = new ArrayList<BitwigSend>();
            for (int i = 0; i < TRACKS_COUNT; i++)
                for (int j = 0; j < SENDS; j++) if (rawCache[i][j].exists)
                    defs.add(cacheToSendDef(rawCache[i][j]));
            this.bus.send(new SendsChanged(defs));
            this.schemaDirty = false;
        }
        for (int i = 0; i < TRACKS_COUNT; i++)
            for (int j = 0; j < SENDS; j++) {
                var s = rawCache[i][j];
                if (s.valueDirty) {
                    if (s.exists)
                        this.bus.send(new SendValueUpdated(s.trackId, s.id, s.value));
                    s.valueDirty = false;
                }
            }
    }

    public void on(Event event) {
        switch (event) {
            case SetSelectedTrackSend(int trackId, int sendId, double v) -> {
                if (trackId == -1 || sendId == -1) return;
                getTrack(trackId).sendBank().getItemAt(sendId).set(v);
            }
            default -> { }
        }
    }
}
