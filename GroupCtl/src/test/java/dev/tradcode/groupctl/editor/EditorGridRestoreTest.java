package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.chromatic.Chromatic;
import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

/**
 * The page-count flash overlays the note grid with pads the painter never sees,
 * so restoring the grid has to repaint them even though the underlying note grid
 * never changed. Wires the calculator, painter and selector together the way the
 * extension does and proves the momentary dots are gone once the flash elapses.
 */
class EditorGridRestoreTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
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

    private static int lastCell(FakeEventBus bus, int i) {
        int note = EditorConstants.PADS.get(i);
        for (int j = bus.events.size() - 1; j >= 0; j--)
            if (bus.events.get(j) instanceof PaintPad p && p.n() == note)
                return p.color();
        return -1;
    }

    @Test
    void flashingThePageCountThenLettingItElapseClearsTheDots() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorGridCalculator(bus);
        new EditorGridPainter(bus);
        new EditorPageSelectorCtl(bus, scheduler);
        new EditorMappingSelector(bus);
        new Chromatic(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipTrackChanged("a track")); // the default mapper publishes its keys
        bus.send(new EditorClipChanged(true, THREE_PAGE_CLIP, List.of())); // empty grid: every cell off

        bus.send(new EditorResolutionChanged(16)); // flashes the page count over the dark grid
        assertEquals(EditorColors.PAGE_DOT_CURRENT, lastCell(bus, 0)); // a dot is showing

        scheduler.runAll(); // the flash elapses
        assertEquals(0, lastCell(bus, 0)); // and the grid is back, dot cleared
    }
}
