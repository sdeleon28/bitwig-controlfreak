package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.ClearLaunchpad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class PagerTest {

    private static class Recorder implements IEventBusSubscriber {
        final ArrayList<Event> received = new ArrayList<>();

        public void on(Event event) {
            received.add(event);
        }
    }

    private static int firstIndexOf(Recorder rec, Class<? extends Event> type) {
        for (int i = 0; i < rec.received.size(); i++)
            if (type.isInstance(rec.received.get(i)))
                return i;
        return -1;
    }

    @Test
    void clearsTheLaunchpadOnLoad() {
        EventBus bus = new EventBus();
        Recorder rec = new Recorder();
        bus.subscribe(rec);
        new Pager(bus);
        assertTrue(rec.received.stream().anyMatch(e -> e instanceof ClearLaunchpad));
    }

    @Test
    void clearsBeforeAnnouncingThePageSwitch() {
        EventBus bus = new EventBus();
        new Pager(bus);
        Recorder rec = new Recorder(); // subscribe after load so we only see the switch
        bus.subscribe(rec);

        bus.send(new TopButtonClick(TopButton.DOWN)); // page 0 -> 1

        int clearIdx = firstIndexOf(rec, ClearLaunchpad.class);
        int pageIdx = firstIndexOf(rec, PageSelected.class);
        assertTrue(clearIdx >= 0, "a clear should be emitted");
        assertTrue(pageIdx >= 0, "the page switch should be announced");
        assertTrue(clearIdx < pageIdx, "clear must precede the PageSelected so pages paint fearlessly");
    }
}
