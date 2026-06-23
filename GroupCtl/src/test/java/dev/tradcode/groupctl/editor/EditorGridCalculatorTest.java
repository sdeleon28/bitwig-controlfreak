package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class EditorGridCalculatorTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    // The chromatic row keys the default mapper would publish for either octave.
    private static final int[] LOW = GridGeometry.chromaticRowKeys(0);
    private static final int[] HIGH = GridGeometry.chromaticRowKeys(EditorConstants.MAX_KEY_OFFSET);

    // A clip that fills the whole read window (the default page count applies).
    private static final double FULL = EditorConstants.READ_BEATS;

    // Enter the editor page with a mapping already published, the state the
    // calculator quantizes against.
    private static void enter(FakeEventBus bus, int[] rowKeys) {
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorRowKeysChanged(rowKeys));
    }

    @Test
    void staysSilentUntilTheEditorPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new EditorRowKeysChanged(LOW));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));
        assertNull(bus.last(EditorGridChanged.class));
    }

    @Test
    void staysSilentUntilAMapperHasPublishedRowKeys() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));
        assertNull(bus.last(EditorGridChanged.class));
    }

    @Test
    void broadcastsAQuantizedGridWhenActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        enter(bus, LOW);
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));

        EditorGridChanged grid = bus.last(EditorGridChanged.class);
        assertEquals(64, grid.slots().size());
        assertTrue(grid.clipExists());
        assertTrue(grid.slots().get(56).lit());   // C1 at beat 0 -> bottom row, col 0
        assertFalse(grid.slots().get(57).lit());
    }

    @Test
    void quantizesNotesOntoWhateverRowKeysTheActiveMapperPublishes() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        // An arbitrary (here, GGD top-page) mapping: the calculator is agnostic.
        int[] drumMap = { 82, 80, 65, 75, 73, 71, 68, 66 };
        enter(bus, drumMap);
        bus.send(new EditorClipChanged(true, FULL,
            List.of(new EditorNote(82, 0.0), new EditorNote(66, 0.0))));

        var slots = bus.last(EditorGridChanged.class).slots();
        assertTrue(slots.get(0).lit());    // key 82 -> top row
        assertTrue(slots.get(56).lit());   // key 66 -> bottom row
        assertFalse(slots.get(8).lit());   // second row is a different key
    }

    @Test
    void recomputesWhenResolutionChanges() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        enter(bus, LOW);
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

        enter(bus, LOW);
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

        enter(bus, LOW); // 1/8, the first window covers [0, 4)
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 4.5))));
        // The onset sits beyond the first window, so nothing lights up yet.
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.lit());

        bus.send(new EditorColumnOffsetChanged(EditorConstants.GRID_COLS)); // window onto [4, 8)
        assertFalse(bus.last(EditorGridChanged.class).slots().get(56).lit()); // [4.0, 4.5)
        assertTrue(bus.last(EditorGridChanged.class).slots().get(57).lit());  // [4.5, 5.0)
    }

    @Test
    void followsTheMapperOntoTheHighOctave() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        enter(bus, LOW);
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(44, 0.0))));
        // The low-octave window [36, 44) leaves key 44 off the top.
        for (var slot : bus.last(EditorGridChanged.class).slots())
            assertFalse(slot.lit());

        bus.send(new EditorRowKeysChanged(HIGH));
        // The high window drops key 44 onto the bottom-left pad.
        assertTrue(bus.last(EditorGridChanged.class).slots().get(56).lit());
    }

    @Test
    void sweepsThePlayingColumnAsThePlayheadMoves() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        enter(bus, LOW);
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

        enter(bus, LOW);
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

        enter(bus, LOW);
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(36, 0.0))));
        long before = bus.count(EditorGridChanged.class);

        bus.send(new PageSelected(0));
        bus.send(new EditorClipChanged(true, FULL, List.of(new EditorNote(37, 0.0))));
        assertEquals(before, bus.count(EditorGridChanged.class));
    }
}
