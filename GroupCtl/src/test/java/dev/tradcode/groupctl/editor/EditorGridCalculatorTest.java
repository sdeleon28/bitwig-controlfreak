package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
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
        assertTrue(grid.slots().get(0).lit());   // C1 at beat 0
        assertFalse(grid.slots().get(1).lit());
    }

    @Test
    void recomputesWhenResolutionChanges() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridCalculator(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, List.of(new EditorNote(36, 0.5))));
        // At 1/8 the onset lands in column 1.
        assertFalse(bus.last(EditorGridChanged.class).slots().get(0).lit());
        assertTrue(bus.last(EditorGridChanged.class).slots().get(1).lit());

        // At 1/4 (1 beat/col) it lands in column 0.
        bus.send(new EditorResolutionChanged(4));
        assertTrue(bus.last(EditorGridChanged.class).slots().get(0).lit());
        assertFalse(bus.last(EditorGridChanged.class).slots().get(1).lit());
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
