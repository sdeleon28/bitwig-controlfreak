package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PageSelected;

class EditorHorizontalPagerTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;
    private static final int COLS = EditorConstants.GRID_COLS;
    private static final double FULL = EditorConstants.READ_BEATS;

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

    private static int lastPage(FakeEventBus bus) {
        return bus.last(EditorPageChanged.class).page();
    }

    private static int lastTotal(FakeEventBus bus) {
        return bus.last(EditorPageChanged.class).totalPages();
    }

    private static EditorHorizontalPager pager(FakeEventBus bus, RecordingScheduler scheduler) {
        return new EditorHorizontalPager(bus, scheduler);
    }

    @Test
    void reportsTheTotalPageCountForTheResolution() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));            // 1/8 -> 16 pages over the 64-beat window
        assertEquals(16, lastTotal(bus));

        bus.send(new EditorResolutionChanged(4));      // 1/4 -> 8 pages
        assertEquals(8, lastTotal(bus));

        bus.send(new EditorResolutionChanged(32));     // 1/32 -> 64 pages
        assertEquals(64, lastTotal(bus));
    }

    @Test
    void boundsThePageCountToTheClipLength() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of())); // a 2-beat clip fits in one 4-beat page
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void keepsTheClipBoundWhenZoomingIn() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of()));
        bus.send(new EditorResolutionChanged(16));     // read window alone would offer 4 pages
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void cannotPageBeyondAShortClip() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of()));   // single page
        bus.send(new RequestEditorPage(1));
        assertEquals(0, lastPage(bus));
    }

    @Test
    void clampsThePageWhenTheClipShrinks() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorResolutionChanged(32));     // 8 pages over the read window
        bus.send(new RequestEditorPage(7));            // last page
        assertEquals(7, lastPage(bus));

        bus.send(new EditorClipChanged(true, 1.0, List.of()));   // 1-beat clip -> one page
        assertEquals(0, lastPage(bus));
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void clampsPagingToTheAvailableRange() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR)); // 1/8 -> 16 pages (0..15)

        bus.send(new RequestEditorPage(-1)); // can't go before the first page
        assertEquals(0, lastPage(bus));

        bus.send(new RequestEditorPage(50)); // can't go past the last page
        assertEquals(15, lastPage(bus));
    }

    @Test
    void clampsThePageWhenResolutionCoarsens() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorResolutionChanged(32)); // 64 pages
        bus.send(new RequestEditorPage(63));       // last page
        assertEquals(63, lastPage(bus));

        bus.send(new EditorResolutionChanged(4));  // 8 pages -> clamp to 7
        assertEquals(7, lastPage(bus));
    }

    @Test
    void keepsTheHorizontalPageOnReentry() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1));
        scheduler.runAll();
        assertEquals(1, lastPage(bus));

        bus.send(new PageSelected(0));
        bus.send(new PageSelected(EDITOR));
        assertEquals(1, lastPage(bus));
    }

    @Test
    void keepsTheHorizontalPageWhenHoppingBetweenEditorPages() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1));
        scheduler.runAll();
        assertEquals(1, lastPage(bus));

        bus.send(new PageSelected(BOTTOM));
        assertEquals(1, lastPage(bus));
    }

    @Test
    void announcesTheDestinationPageImmediatelyWhenPaging() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1)); // no frames run yet
        assertEquals(1, lastPage(bus));
    }

    @Test
    void scrollsTheColumnOffsetOneColumnAtATime() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR)); // snap to column 0
        bus.send(new RequestEditorPage(1)); // animate 0 -> 8
        scheduler.runAll();

        assertEquals(List.of(0, 1, 2, 3, 4, 5, 6, 7, COLS), colOffsets(bus));
    }

    @Test
    void schedulesEachScrollFrameLaterThanTheLast() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1));

        assertEquals(COLS, scheduler.delays.size(), "one frame per column crossed");
        for (int i = 1; i < scheduler.delays.size(); i++)
            assertTrue(scheduler.delays.get(i) > scheduler.delays.get(i - 1),
                "frames must be spaced out in time");
    }

    @Test
    void snapsToTheColumnBoundaryOnEntryWithoutAnimating() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR));

        assertEquals(List.of(0), colOffsets(bus));
        assertTrue(scheduler.delays.isEmpty(), "a fresh entry should not animate");
    }

    @Test
    void abandonsAnInFlightScrollWhenLeavingTheEditor() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR)); // snap to 0
        bus.send(new RequestEditorPage(1)); // schedule 0 -> 8
        bus.send(new PageSelected(0));      // leave before any frame fires
        scheduler.runAll();

        assertEquals(List.of(0), colOffsets(bus), "queued frames must not paint after leaving");
    }

    @Test
    void snapsToThePageBoundaryOnReentryAfterPaging() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        pager(bus, scheduler);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1));
        scheduler.runAll();                 // settle on column 8
        int framesScheduled = scheduler.delays.size();

        bus.send(new PageSelected(0));
        bus.send(new PageSelected(EDITOR)); // re-enter onto the kept page

        assertEquals(COLS, colOffsets(bus).get(colOffsets(bus).size() - 1));
        assertEquals(framesScheduled, scheduler.delays.size(), "re-entry snaps, it does not animate");
    }
}
