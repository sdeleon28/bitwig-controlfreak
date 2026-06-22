package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class EditorGridCalculatorTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    // A clip that fills the whole read window (the default page count applies).
    private static final double FULL = EditorConstants.READ_BEATS;

    @Test
    void staysSilentUntilTheEditorPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));
        assertNull(bus.last(EditorGridChanged.class));
    }

    @Test
    void broadcastsAQuantizedGridWhenActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));

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
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.5))));
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
        bus.send(new EditorClipChanged(false, 0.0, List.of()));

        EditorGridChanged grid = bus.last(EditorGridChanged.class);
        assertFalse(grid.clipExists());
        for (var slot : grid.slots())
            assertFalse(slot.lit());
    }

    @Test
    void windowsOntoLaterBeatsAtAColumnOffset() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR)); // 1/8, the first window covers [0, 4)
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 4.5))));
        // The onset sits beyond the first window, so nothing lights up yet.
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.lit());

        bus.send(new EditorColumnOffsetChanged(EditorConstants.GRID_COLS)); // window onto [4, 8)
        assertFalse(bus.last(EditorGridChanged.class).slots().get(56).lit()); // [4.0, 4.5)
        assertTrue(bus.last(EditorGridChanged.class).slots().get(57).lit());  // [4.5, 5.0)
    }

    @Test
    void windowsOntoTheHighOctaveAtAKeyOffset() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(44, 0.0))));
        // The default window is the low octave [36, 44): key 44 sits off the top.
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.lit());

        bus.send(new EditorKeyOffsetChanged(EditorConstants.MAX_KEY_OFFSET));
        // The high window drops key 44 onto the bottom-left pad.
        assertTrue(bus.last(EditorGridChanged.class).slots().get(56).lit());
    }

    @Test
    void sweepsThePlayingColumnAsThePlayheadMoves() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of()));

        bus.send(new EditorPlaybackPosition(0.6)); // 1/8 -> column 1
        assertTrue(bus.last(EditorGridChanged.class).slots().get(57).playing());
        assertFalse(bus.last(EditorGridChanged.class).slots().get(56).playing());

        bus.send(new EditorPlaybackPosition(-1.0)); // stopped
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.playing());
    }

    @Test
    void staysSilentUnderThePagePickerOverlay() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of()));
        bus.send(new dev.tradcode.groupctl.editor.events.EditorPagerMode(true));
        long before = bus.count(EditorGridChanged.class);

        bus.send(new EditorPlaybackPosition(0.6)); // a playhead tick must not repaint the grid
        assertEquals(before, bus.count(EditorGridChanged.class));
    }

    @Test
    void stopsBroadcastingAfterLeavingThePage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));
        long before = bus.count(EditorGridChanged.class);

        bus.send(new PageSelected(0));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(37, 0.0))));
        assertEquals(before, bus.count(EditorGridChanged.class));
    }
}
