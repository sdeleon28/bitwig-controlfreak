package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PageSelected;

class EditorVerticalPagerTest {

    private static final int TOP = EditorConstants.PAGE_INDEX;
    private static final int BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;
    private static final int HIGH = EditorConstants.MAX_KEY_OFFSET;

    /** Captures scheduled frames so the test decides when (and whether) they fire. */
    private static final class RecordingScheduler implements Scheduler {
        final List<Long> delays = new ArrayList<>();
        private final List<Runnable> tasks = new ArrayList<>();

        public void schedule(Runnable task, long delayMs) {
            this.delays.add(delayMs);
            this.tasks.add(task);
        }

        void runAll() {
            for (Runnable t : new ArrayList<>(this.tasks))
                t.run();
        }
    }

    private static List<Integer> offsets(FakeEventBus bus) {
        List<Integer> result = new ArrayList<>();
        for (Event e : bus.events)
            if (e instanceof EditorKeyOffsetChanged k)
                result.add(k.keyOffset());
        return result;
    }

    @Test
    void snapsToTheHighWindowWhenEnteringTheTopPage() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(TOP));

        assertEquals(List.of(HIGH), offsets(bus));
        assertTrue(scheduler.delays.isEmpty(), "a fresh entry should not animate");
    }

    @Test
    void snapsToTheLowWindowWhenEnteringTheBottomPage() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(BOTTOM));

        assertEquals(List.of(0), offsets(bus));
        assertTrue(scheduler.delays.isEmpty());
    }

    @Test
    void scrollsDownOneRowAtATimeFromTopToBottom() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(TOP));      // snap to 8
        bus.send(new PageSelected(BOTTOM));   // animate 8 -> 0
        scheduler.runAll();

        assertEquals(List.of(HIGH, 7, 6, 5, 4, 3, 2, 1, 0), offsets(bus));
    }

    @Test
    void scrollsUpOneRowAtATimeFromBottomToTop() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(BOTTOM));   // snap to 0
        bus.send(new PageSelected(TOP));      // animate 0 -> 8
        scheduler.runAll();

        assertEquals(List.of(0, 1, 2, 3, 4, 5, 6, 7, HIGH), offsets(bus));
    }

    @Test
    void schedulesEachScrollFrameLaterThanTheLast() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(TOP));
        bus.send(new PageSelected(BOTTOM));

        assertEquals(HIGH, scheduler.delays.size(), "one frame per row crossed");
        for (int i = 1; i < scheduler.delays.size(); i++)
            assertTrue(scheduler.delays.get(i) > scheduler.delays.get(i - 1),
                "frames must be spaced out in time");
    }

    @Test
    void abandonsAnInFlightScrollWhenLeavingTheEditor() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(TOP));      // snap to 8
        bus.send(new PageSelected(BOTTOM));   // schedule 8 -> 0
        bus.send(new PageSelected(0));        // leave before any frame fires
        scheduler.runAll();

        assertEquals(List.of(HIGH), offsets(bus), "queued frames must not paint after leaving");
    }

    @Test
    void reentryAfterLeavingSnapsRatherThanScrolls() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorVerticalPager(bus, scheduler);

        bus.send(new PageSelected(TOP));
        bus.send(new PageSelected(0));
        bus.send(new PageSelected(BOTTOM));   // re-enter the editor elsewhere

        assertEquals(List.of(HIGH, 0), offsets(bus));
        assertTrue(scheduler.delays.isEmpty(), "crossing in from outside should not animate");
    }
}
