package dev.tradcode.groupctl.editor.animatedscroll;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PageSelected;

class AnimatedScrollCtlTest {

    private static final int COLS = EditorConstants.GRID_COLS;
    private static final int EDITOR = EditorConstants.PAGE_INDEX;

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

    private static List<Integer> colOffsets(FakeEventBus bus) {
        List<Integer> result = new ArrayList<>();
        for (Event e : bus.events)
            if (e instanceof EditorColumnOffsetChanged c)
                result.add(c.colOffset());
        return result;
    }

    @Test
    void walksTheColumnOffsetOneColumnAtATime() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, true)); // animate 0 -> 8
        scheduler.runAll();

        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, COLS), colOffsets(bus));
    }

    @Test
    void schedulesEachFrameLaterThanTheLast() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, true));

        assertEquals(COLS, scheduler.delays.size(), "one frame per column crossed");
        for (int i = 1; i < scheduler.delays.size(); i++)
            assertTrue(scheduler.delays.get(i) > scheduler.delays.get(i - 1),
                "frames must be spaced out in time");
    }

    @Test
    void startsFromTheCurrentOffsetItHasBeenTracking() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new EditorColumnOffsetChanged(COLS)); // a jump landed us on column 8
        bus.send(new RequestColumnScroll(2 * COLS, true)); // animate 8 -> 16
        scheduler.runAll();

        assertEquals(List.of(COLS, 9, 10, 11, 12, 13, 14, 15, 2 * COLS), colOffsets(bus));
    }

    @Test
    void ignoresInstantScrollRequests() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, false));

        assertTrue(scheduler.delays.isEmpty(), "instant requests belong to the other scroller");
        assertEquals(List.of(), colOffsets(bus));
    }

    @Test
    void abandonsAnInFlightScrollWhenLeavingTheEditor() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, true)); // schedule 0 -> 8
        bus.send(new PageSelected(0));                  // leave before any frame fires
        scheduler.runAll();

        assertEquals(List.of(), colOffsets(bus), "queued frames must not paint after leaving");
    }

    @Test
    void abandonsAnInFlightScrollWhenAnInstantJumpSupersedesIt() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, true));        // schedule 0 -> 8
        bus.send(new RequestColumnScroll(4 * COLS, false));   // an instant jump cancels it
        scheduler.runAll();

        assertEquals(List.of(), colOffsets(bus), "the superseded animation must not paint");
    }

    @Test
    void keepsThePageWhenStillOnAnEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new AnimatedScrollCtl(bus, scheduler);

        bus.send(new RequestColumnScroll(COLS, true)); // schedule 0 -> 8
        bus.send(new PageSelected(EDITOR));            // hopping between editor pages does not cancel
        scheduler.runAll();

        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, COLS), colOffsets(bus));
    }
}
