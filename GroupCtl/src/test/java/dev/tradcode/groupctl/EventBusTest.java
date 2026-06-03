package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.ArrayList;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

class EventBusTest {

    /** Collects every event it receives so tests can assert on delivery. */
    private static class Recorder implements IEventBusSubscriber {
        final ArrayList<Event> received = new ArrayList<>();

        @Override
        public void on(Event event) {
            received.add(event);
        }
    }

    @Test
    void deliversEventToSubscriber() {
        EventBus bus = new EventBus();
        Recorder sub = new Recorder();
        bus.subscribe(sub);

        Event event = new Event();
        bus.send(event);

        assertEquals(1, sub.received.size());
        assertSame(event, sub.received.get(0));
    }

    @Test
    void fansOutToEverySubscriber() {
        EventBus bus = new EventBus();
        Recorder a = new Recorder();
        Recorder b = new Recorder();
        bus.subscribe(a);
        bus.subscribe(b);

        bus.send(new Log("hi"));

        assertEquals(1, a.received.size());
        assertEquals(1, b.received.size());
    }

    @Test
    void deliversNothingWithoutSubscribers() {
        EventBus bus = new EventBus();
        // Should not throw with no subscribers registered.
        bus.send(new Event());
    }
}
