package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigFxTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.FxPanUpdated;
import dev.tradcode.groupctl.mixmachine.events.FxSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.FxVolumeUpdated;
import dev.tradcode.groupctl.mixmachine.events.RequestFxSetSolo;
import dev.tradcode.groupctl.mixmachine.events.SetFxTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetFxTrackVolume;
import java.util.ArrayList;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestFxToggleMute;
import dev.tradcode.groupctl.events.RequestFxToggleRec;
import dev.tradcode.groupctl.events.RequestFxToggleSolo;

class FxCache {
    boolean exists;
    Integer id;
    String name;
    boolean mute;
    boolean solo;
    boolean rec;
    String color = "";
    boolean isSelectedInEditor;
    boolean isSelectedInMixer;
    double volume;
    double pan;
    boolean volumeDirty;
    boolean panDirty;
}

public class BitwigFxTracker implements IEventBusSubscriber {
    static int FX_TRACKS_COUNT = 8;

    IEventBus bus;
    ControllerHost host;
    TrackBank bank;
    FxCache[] rawCache = new FxCache[FX_TRACKS_COUNT];
    boolean cacheDirty = false;

    public BitwigFxTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
        this.bank = this.host.createEffectTrackBank(FX_TRACKS_COUNT, 0);
        for (int i = 0; i < FX_TRACKS_COUNT; i++) {
            rawCache[i] = new FxCache();
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
                    this.bus.send(new BitwigFxTrackSelected(rawCache[j].id));
                rawCache[j].isSelectedInMixer = v;
                cacheDirty = true;
            });
            t.volume().value().addValueObserver(v -> {
                // store the volume but don't publish a full schema over it;
                // a granular FxVolumeUpdated is emitted on flush instead
                rawCache[j].volume = v;
                rawCache[j].volumeDirty = true;
            });
            t.pan().value().addValueObserver(v -> {
                // store the pan but don't publish a full schema over it;
                // a granular FxPanUpdated is emitted on flush instead
                rawCache[j].pan = v;
                rawCache[j].panDirty = true;
            });
        }
    }

    public Track getTrack(int id) {
        return this.bank.getItemAt(id);
    }

    // if you touch this, you probably wanna do the same in BitwigSchemaTracker
    private BitwigTrack cacheToTrackDef(FxCache t) {
        BitwigTrack bt = new BitwigTrack();
        bt.id = t.id;
        bt.name = t.name;
        bt.mute = t.mute;
        bt.solo = t.solo;
        bt.rec = t.rec;
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
        if (this.cacheDirty) {
            var defs = new ArrayList<BitwigTrack>();
            for (int i = 0; i < FX_TRACKS_COUNT; i++) if (rawCache[i].exists)
                defs.add(cacheToTrackDef(rawCache[i]));
            this.bus.send(new FxSchemaChanged(defs));
            this.cacheDirty = false;
        }
        for (int i = 0; i < FX_TRACKS_COUNT; i++) {
            var t = rawCache[i];
            if (t.volumeDirty) {
                if (t.exists)
                    this.bus.send(new FxVolumeUpdated(t.id, t.volume));
                t.volumeDirty = false;
            }
            if (t.panDirty) {
                if (t.exists)
                    this.bus.send(new FxPanUpdated(t.id, t.pan));
                t.panDirty = false;
            }
        }
    }

    public void on(Event event) {
        switch (event) {
            case RequestFxToggleMute(int id, String trackName) ->
                getTrack(id).mute().toggle();
            case RequestFxToggleSolo(int id, String trackName) ->
                getTrack(id).solo().toggle();
            case RequestFxSetSolo(int id, String trackName, boolean solo) ->
                getTrack(id).solo().set(solo);
            case RequestFxToggleRec(int id, String trackName) ->
                getTrack(id).arm().toggle();
            case SetFxTrackVolume(int id, double v) ->
                getTrack(id).volume().value().set(v);
            case SetFxTrackPan(int id, double v) ->
                getTrack(id).pan().value().set(v);
            default -> { }
        }
    }
}
