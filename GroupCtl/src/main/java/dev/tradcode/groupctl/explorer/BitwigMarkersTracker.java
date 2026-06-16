package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import java.util.ArrayList;
import java.util.List;

import com.bitwig.extension.controller.api.Arranger;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CueMarker;
import com.bitwig.extension.controller.api.CueMarkerBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

class MarkerCache {
    boolean exists;
    double position;
    String name = "";
    String color = "";
}

/**
 * Tracks the arranger's cue markers and emits a sorted {@link MarkersChanged}
 * snapshot on the flush cycle whenever any marker metadata changes.
 */
public class BitwigMarkersTracker implements IEventBusSubscriber {
    static final int MARKER_COUNT = 32;

    ControllerHost host;
    IEventBus bus;
    Arranger arranger;
    CueMarkerBank markerBank;
    MarkerCache[] rawCache = new MarkerCache[MARKER_COUNT];
    boolean dirty = false;

    protected BitwigMarkersTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        for (int i = 0; i < MARKER_COUNT; i++)
            rawCache[i] = new MarkerCache();
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.arranger = host.createArranger();
        this.markerBank = arranger.createCueMarkerBank(MARKER_COUNT);
        for (int i = 0; i < MARKER_COUNT; i++) {
            final int j = i;
            CueMarker m = markerBank.getItemAt(i);
            m.exists().addValueObserver(v -> {
                rawCache[j].exists = v;
                dirty = true;
            });
            m.position().addValueObserver(v -> {
                rawCache[j].position = v;
                dirty = true;
            });
            m.name().addValueObserver(v -> {
                rawCache[j].name = v;
                dirty = true;
            });
            m.getColor().addValueObserver((r, g, b) -> {
                // Quantize each channel to the nearest even value, mirroring the
                // schema tracker so palette lookups in Colors line up.
                int r255 = (int) Math.round(r * 255.0) & ~1;
                int g255 = (int) Math.round(g * 255.0) & ~1;
                int b255 = (int) Math.round(b * 255.0) & ~1;
                rawCache[j].color = r255 + "," + g255 + "," + b255;
                dirty = true;
            });
        }
    }

    public void on(Event event) {
        // No requests handled; this tracker is read-only.
    }

    /**
     * For testing. Don't use this.
     */
    public void _setMarkerCache(int i, MarkerCache c) {
        this.rawCache[i] = c;
        this.dirty = true;
    }

    public void flush() {
        if (!this.dirty)
            return;
        List<Marker> markers = new ArrayList<>();
        for (MarkerCache c : rawCache)
            if (c.exists)
                markers.add(new Marker(c.position, c.color, c.name));
        markers.sort((a, b) -> Double.compare(a.position(), b.position()));
        this.bus.send(new MarkersChanged(markers));
        this.dirty = false;
    }
}
