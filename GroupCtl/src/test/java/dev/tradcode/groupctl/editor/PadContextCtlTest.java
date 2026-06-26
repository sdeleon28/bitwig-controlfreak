package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;
import dev.tradcode.groupctl.events.PadLongPressStarted;
import dev.tradcode.groupctl.events.PageSelected;

class PadContextCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    private static EditorSlot unlit() {
        return new EditorSlot(false, 36, 0.0, 0.5);
    }

    private static List<EditorSlot> grid(Map<Integer, EditorSlot> overrides) {
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            slots.add(overrides.getOrDefault(i, unlit()));
        return slots;
    }

    private static PadContextCtl onEditor(FakeEventBus bus, Map<Integer, EditorSlot> overrides) {
        var ctl = new PadContextCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(overrides), true));
        return ctl;
    }

    @Test
    void holdingLitPadSelectsItsNote() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        RequestSelectNotes req = bus.last(RequestSelectNotes.class);
        assertNotNull(req);
        assertEquals(1, req.cells().size());
        assertEquals(36, req.cells().get(0).key());
        assertEquals(0.0, req.cells().get(0).startBeat());
        assertEquals(0.5, req.cells().get(0).endBeat());
        assertEquals(0.6, req.cells().get(0).velocity(), 1e-9);
    }

    @Test
    void holdingMultiplePadsSelectsThemAll() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6),
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        ));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(1)));

        RequestSelectNotes req = bus.last(RequestSelectNotes.class);
        assertEquals(2, req.cells().size());
    }

    @Test
    void releasingOneOfSeveralKeepsTheRestSelected() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6),
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        ));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(1)));

        bus.send(new PadLongPressed(EditorConstants.PADS.get(0)));

        RequestSelectNotes req = bus.last(RequestSelectNotes.class);
        assertEquals(1, req.cells().size());
        assertEquals(0.5, req.cells().get(0).startBeat());
    }

    @Test
    void releasingTheLastHeldPadClearsTheSelection() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        bus.send(new PadLongPressed(EditorConstants.PADS.get(0)));

        RequestSelectNotes req = bus.last(RequestSelectNotes.class);
        assertTrue(req.cells().isEmpty());
    }

    @Test
    void aVanishedHeldNoteResyncsTheSelection() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6),
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        ));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(1)));

        // The note under pad 0 disappears (e.g. cleared elsewhere); the grid
        // repaints without it, and the selection must drop to just pad 1.
        bus.send(new EditorGridChanged(grid(Map.of(
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        )), true));

        RequestSelectNotes req = bus.last(RequestSelectNotes.class);
        assertEquals(1, req.cells().size());
        assertEquals(0.5, req.cells().get(0).startBeat());
    }

    @Test
    void ignoresHoldsWhileInPagerMode() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new EditorPagerMode(true)); // grid is now a page picker

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void enteringPagerModeClearsTheSelection() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        assertEquals(1, bus.last(RequestSelectNotes.class).cells().size());

        bus.send(new EditorPagerMode(true));

        assertTrue(bus.last(RequestSelectNotes.class).cells().isEmpty());
    }

    @Test
    void leavingTheEditorPageClearsTheSelection() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        assertEquals(1, bus.last(RequestSelectNotes.class).cells().size());

        bus.send(new PageSelected(0));

        assertTrue(bus.last(RequestSelectNotes.class).cells().isEmpty());
    }

    @Test
    void holdingAnUnlitPadDoesNothing() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of());

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void ignoresHoldsWhenNotOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PadContextCtl(bus);
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)
        )), true));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void ignoresHoldsWhenNoClipIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new PadContextCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)
        )), false));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void shortTapNeitherSelectsNorClears() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestSelectNotes.class));
    }
}
