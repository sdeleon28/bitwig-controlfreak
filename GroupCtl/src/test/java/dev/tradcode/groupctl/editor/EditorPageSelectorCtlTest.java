package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestClearNotes;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

class EditorPageSelectorCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    // At the default 1/8 resolution a page spans 4 beats, so a 12-beat clip is
    // exactly three pages.
    private static final double THREE_PAGE_CLIP = 12.0;

    private static final class RecordingScheduler implements Scheduler {
        private final List<Runnable> tasks = new ArrayList<>();

        public void schedule(Runnable task, long delayMs) {
            this.tasks.add(task);
        }

        void runAll() {
            for (Runnable t : new ArrayList<>(this.tasks))
                t.run();
        }
    }

    private static int padAt(int i) {
        return EditorConstants.PADS.get(i);
    }

    /** Final color pushed to the pad at grid index {@code i}, or -1 if untouched. */
    private static int lastCell(FakeEventBus bus, int i) {
        int note = padAt(i);
        for (int j = bus.events.size() - 1; j >= 0; j--)
            if (bus.events.get(j) instanceof PaintPad p && p.n() == note)
                return p.color();
        return -1;
    }

    private static boolean modeEndedLast(FakeEventBus bus) {
        EditorPagerMode last = bus.last(EditorPagerMode.class);
        return last != null && !last.active();
    }

    private static void enterThreePageEditor(FakeEventBus bus) {
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, THREE_PAGE_CLIP, List.of()));
    }

    @Test
    void pagerModeLaysPagesAcrossTheGridInReadingOrder() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        enterThreePageEditor(bus);
        bus.send(new EditorPagerMode(true));

        assertEquals(EditorColors.PAGE_DOT_CURRENT, lastCell(bus, 0)); // page 0, top-left
        assertEquals(EditorColors.PAGE_DOT, lastCell(bus, 1));         // page 1
        assertEquals(EditorColors.PAGE_DOT, lastCell(bus, 2));         // page 2
        assertEquals(0, lastCell(bus, 3));                             // no page here
    }

    @Test
    void tappingAPagePadJumpsToItAndExitsMode() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorPageSelectorCtl(bus, scheduler);

        enterThreePageEditor(bus);
        bus.send(new EditorPagerMode(true));

        bus.send(new PadClicked(padAt(2))); // jump to page 2

        assertEquals(2, bus.last(RequestEditorPage.class).delta());
        // The mode leaves on the next tick, not reentrantly, so the tap can't
        // also slip through to the note handler.
        scheduler.runAll();
        assertTrue(modeEndedLast(bus));
    }

    @Test
    void tappingTheCurrentPageJustExitsMode() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorPageSelectorCtl(bus, scheduler);

        enterThreePageEditor(bus);
        bus.send(new EditorPagerMode(true));

        bus.send(new PadClicked(padAt(0))); // already on page 0

        assertNull(bus.last(RequestEditorPage.class));
        scheduler.runAll();
        assertTrue(modeEndedLast(bus));
    }

    @Test
    void tappingAPageDoesNotLeakIntoTheNoteEditor() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        // Wired in Editor.java order: the page selector subscribes before the
        // note handler, so a reentrant mode-off would re-arm the note handler
        // while this very tap is still being dispatched to it.
        new EditorPageSelectorCtl(bus, scheduler);
        new EditorNoteHandler(bus);

        enterThreePageEditor(bus);
        // A lit note sits under the pad we tap; a leaked tap would erase it.
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            slots.add(new EditorSlot(false, 36, 0.0, 0.5));
        slots.set(2, new EditorSlot(true, 36, 0.0, 0.5));
        bus.send(new EditorGridChanged(slots, true));
        bus.send(new EditorPagerMode(true));

        bus.send(new PadClicked(padAt(2))); // pick page 2 from the overlay

        assertNull(bus.last(RequestSetNote.class));
        assertNull(bus.last(RequestClearNotes.class));
        assertEquals(2, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void ignoresPadsBeyondTheTotalPageCount() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        enterThreePageEditor(bus);
        bus.send(new EditorPagerMode(true));

        bus.send(new PadClicked(padAt(5))); // no page lives here

        assertNull(bus.last(RequestEditorPage.class));
        assertTrue(bus.last(EditorPagerMode.class).active()); // still in mode
    }

    @Test
    void leavingPagerModeRestoresTheNoteGrid() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        enterThreePageEditor(bus);
        bus.send(new EditorPagerMode(true));
        bus.send(new EditorPagerMode(false));

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
    }

    @Test
    void changingResolutionFlashesTheNewPageCountThenRestoresTheNotes() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        // No pager wired in: the selector derives the page count itself, so the
        // flash is correct regardless of who else reacts to the resolution change.
        new EditorPageSelectorCtl(bus, scheduler);

        enterThreePageEditor(bus);                  // 1/8 -> 3 pages (cells 0..2)
        bus.send(new EditorResolutionChanged(16));  // 1/16 -> 6 pages (cells 0..5)

        assertEquals(EditorColors.PAGE_DOT_CURRENT, lastCell(bus, 0));
        assertEquals(EditorColors.PAGE_DOT, lastCell(bus, 4)); // only reachable at 1/16
        assertNull(bus.last(RequestEditorGridRepaint.class));  // notes not back yet

        scheduler.runAll();
        assertNotNull(bus.last(RequestEditorGridRepaint.class));
    }

    @Test
    void doesNotFlashOnPlainPageChanges() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        enterThreePageEditor(bus);
        bus.send(new EditorPageChanged(0, 3)); // paging / entry, not a resolution change

        assertEquals(-1, lastCell(bus, 0)); // the grid was left untouched
    }

    @Test
    void doesNotFlashWhenOffTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(0)); // not an editor page
        bus.send(new EditorResolutionChanged(16));

        assertEquals(-1, lastCell(bus, 0));
    }

    @Test
    void ignoresPadClicksOutsidePagerMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageSelectorCtl(bus, new RecordingScheduler());

        enterThreePageEditor(bus);

        bus.send(new PadClicked(padAt(2)));

        assertNull(bus.last(RequestEditorPage.class));
        assertNull(bus.last(EditorPagerMode.class));
    }
}
