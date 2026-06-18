package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class EditorGridCalculatorTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    @Test
    void staysSilentUntilTheEditorPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 0.0))));
        assertNull(bus.last(EditorGridChanged.class));
    }

    @Test
    void broadcastsAQuantizedGridWhenActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 0.0))));

        EditorGridChanged grid = bus.last(EditorGridChanged.class);
        assertEquals(64, grid.slots().size());
        assertTrue(grid.clipExists());
        assertTrue(grid.slots().get(56).lit());   // C1 at beat 0 -> bottom row, col 0
        assertFalse(grid.slots().get(57).lit());
    }

    @Test
    void recomputesWhenResolutionChanges() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 0.5))));
        // C1 sits on the bottom row; at 1/8 the onset lands in column 1.
        assertFalse(bus.last(EditorGridChanged.class).slots().get(56).lit());
        assertTrue(bus.last(EditorGridChanged.class).slots().get(57).lit());

        // At 1/4 (1 beat/col) it lands in column 0.
        bus.send(new EditorResolutionChanged(4));
        assertTrue(bus.last(EditorGridChanged.class).slots().get(56).lit());
        assertFalse(bus.last(EditorGridChanged.class).slots().get(57).lit());
    }

    @Test
    void emptyClipProducesAnUnlitGrid() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(false, List.of()));

        EditorGridChanged grid = bus.last(EditorGridChanged.class);
        assertFalse(grid.clipExists());
        for (var slot : grid.slots())
            assertFalse(slot.lit());
    }

    @Test
    void reportsTheTotalPageCountForTheResolution() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR)); // 1/8 -> 2 pages
        assertEquals(2, bus.last(EditorPageChanged.class).totalPages());

        bus.send(new EditorResolutionChanged(4)); // 1/4 -> 1 page
        assertEquals(1, bus.last(EditorPageChanged.class).totalPages());

        bus.send(new EditorResolutionChanged(32)); // 1/32 -> 8 pages
        assertEquals(8, bus.last(EditorPageChanged.class).totalPages());
    }

    @Test
    void pagingWindowsOntoLaterBeatsOfTheClip() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR)); // 1/8, page 0 covers [0, 4)
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 4.5))));
        // The onset sits beyond the first page, so nothing lights up yet.
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.lit());

        bus.send(new RequestEditorPage(1)); // page 1 covers [4, 8)
        assertEquals(1, bus.last(EditorPageChanged.class).page());
        assertFalse(bus.last(EditorGridChanged.class).slots().get(56).lit()); // [4.0, 4.5)
        assertTrue(bus.last(EditorGridChanged.class).slots().get(57).lit());  // [4.5, 5.0)
    }

    @Test
    void clampsPagingToTheAvailableRange() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR)); // 1/8 -> 2 pages (0..1)

        bus.send(new RequestEditorPage(-1)); // can't go before the first page
        assertEquals(0, bus.last(EditorPageChanged.class).page());

        bus.send(new RequestEditorPage(5)); // can't go past the last page
        assertEquals(1, bus.last(EditorPageChanged.class).page());
    }

    @Test
    void clampsThePageWhenResolutionCoarsens() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorResolutionChanged(16)); // 4 pages
        bus.send(new RequestEditorPage(3));         // last page
        assertEquals(3, bus.last(EditorPageChanged.class).page());

        bus.send(new EditorResolutionChanged(4));   // 1 page -> clamp to 0
        assertEquals(0, bus.last(EditorPageChanged.class).page());
    }

    @Test
    void resetsToTheFirstPageOnReentry() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1));
        assertEquals(1, bus.last(EditorPageChanged.class).page());

        bus.send(new PageSelected(0));
        bus.send(new PageSelected(EDITOR));
        assertEquals(0, bus.last(EditorPageChanged.class).page());
    }

    @Test
    void stopsBroadcastingAfterLeavingThePage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 0.0))));
        long before = bus.count(EditorGridChanged.class);

        bus.send(new PageSelected(0));
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(37, 0.0))));
        assertEquals(before, bus.count(EditorGridChanged.class));
    }
}
