package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.SendValueUpdated;
import dev.tradcode.groupctl.mixmachine.events.SendsChanged;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;


class BitwigSendsTrackerTest {

    @Test
    void testFlushEmitsSchemaForExistingSends() {
        FakeEventBus bus = new FakeEventBus();
        BitwigSendsTracker tracker = new BitwigSendsTracker(bus, null);

        SendCache s = new SendCache();
        s.exists = true;
        s.trackId = 1;
        s.id = 2;
        s.name = "Reverb";
        s.value = 0.5;
        tracker._setRawSendCache(1, 2, s);

        tracker.flush();

        assertEquals(1, bus.events.size());
        assertTrue(bus.events.get(0) instanceof SendsChanged);
        SendsChanged changed = (SendsChanged) bus.events.get(0);
        assertEquals(1, changed.sends().size());
        assertEquals(1, changed.sends().get(0).trackId);
        assertEquals(2, changed.sends().get(0).id);
        assertEquals(0.5, changed.sends().get(0).value);
    }

    @Test
    void testValueChangeEmitsGranularUpdateNotSchema() {
        FakeEventBus bus = new FakeEventBus();
        BitwigSendsTracker tracker = new BitwigSendsTracker(bus, null);

        SendCache s = new SendCache();
        s.exists = true;
        s.trackId = 1;
        s.id = 2;
        s.name = "Reverb";
        s.value = 0.5;
        tracker._setRawSendCache(1, 2, s);
        tracker.flush();
        bus.events.clear();

        tracker._setRawSendValue(1, 2, 0.8);
        tracker.flush();

        assertEquals(1, bus.events.size());
        assertTrue(bus.events.get(0) instanceof SendValueUpdated);
        SendValueUpdated updated = (SendValueUpdated) bus.events.get(0);
        assertEquals(1, updated.trackId());
        assertEquals(2, updated.sendId());
        assertEquals(0.8, updated.value());
    }

    @Test
    void testFlushIsNoOpWhenNothingChanged() {
        FakeEventBus bus = new FakeEventBus();
        BitwigSendsTracker tracker = new BitwigSendsTracker(bus, null);

        tracker.flush();

        assertEquals(0, bus.events.size());
    }
}
