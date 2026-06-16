package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.MarkersChanged;

class BitwigMarkersTrackerTest {

    private static MarkerCache marker(double pos, String color, String name) {
        MarkerCache c = new MarkerCache();
        c.exists = true;
        c.position = pos;
        c.color = color;
        c.name = name;
        return c;
    }

    @Test
    void flushEmitsSortedExistingMarkers() {
        FakeEventBus bus = new FakeEventBus();
        BitwigMarkersTracker tracker = new BitwigMarkersTracker(bus, null);

        tracker._setMarkerCache(0, marker(16, "216,46,34", "B"));
        tracker._setMarkerCache(1, marker(0, "0,156,68", "A"));
        tracker.flush();

        MarkersChanged ev = bus.last(MarkersChanged.class);
        assertEquals(2, ev.markers().size());
        assertEquals(0.0, ev.markers().get(0).position());
        assertEquals("A", ev.markers().get(0).name());
        assertEquals(16.0, ev.markers().get(1).position());
    }

    @Test
    void cleanFlushEmitsNothing() {
        FakeEventBus bus = new FakeEventBus();
        BitwigMarkersTracker tracker = new BitwigMarkersTracker(bus, null);
        tracker.flush();
        assertNull(bus.last(MarkersChanged.class));
    }

    @Test
    void nonExistentMarkersAreExcluded() {
        FakeEventBus bus = new FakeEventBus();
        BitwigMarkersTracker tracker = new BitwigMarkersTracker(bus, null);
        tracker._setMarkerCache(0, marker(0, "0,156,68", "A"));
        tracker.flush();
        assertEquals(1, bus.last(MarkersChanged.class).markers().size());
    }
}
