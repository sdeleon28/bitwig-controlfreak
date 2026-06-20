package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestEndNoteContext;
import dev.tradcode.groupctl.editor.events.RequestNoteContext;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;
import dev.tradcode.groupctl.events.PadLongPressStarted;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

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

    /** Final pad color pushed to {@code note}, or null if untouched. */
    private static Integer padColor(FakeEventBus bus, int note) {
        Integer c = null;
        for (var e : bus.events)
            if (e instanceof PaintPad p && p.n() == note) c = p.color();
        return c;
    }

    private static PadContextCtl onEditor(FakeEventBus bus, Map<Integer, EditorSlot> overrides) {
        var ctl = new PadContextCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(overrides), true));
        return ctl;
    }

    @Test
    void holdingLitPadArmsTheNoteContextAndLightsRed() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        RequestNoteContext req = bus.last(RequestNoteContext.class);
        assertNotNull(req);
        assertEquals(1, req.cells().size());
        assertEquals(36, req.cells().get(0).key());
        assertEquals(0.0, req.cells().get(0).startBeat());
        assertEquals(0.5, req.cells().get(0).endBeat());
        assertEquals(0.6, req.cells().get(0).velocity(), 1e-9);
        assertEquals(EditorColors.ACTIVE_CONTEXT, padColor(bus, EditorConstants.PADS.get(0)));
    }

    @Test
    void holdingMultiplePadsAddsThemAllToTheContext() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6),
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        ));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(1)));

        RequestNoteContext req = bus.last(RequestNoteContext.class);
        assertEquals(2, req.cells().size());
        assertEquals(EditorColors.ACTIVE_CONTEXT, padColor(bus, EditorConstants.PADS.get(0)));
        assertEquals(EditorColors.ACTIVE_CONTEXT, padColor(bus, EditorConstants.PADS.get(1)));
    }

    @Test
    void releasingOneOfSeveralKeepsTheRest() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6),
            1, new EditorSlot(true, 36, 0.5, 1.0, 0.7)
        ));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(1)));

        bus.send(new PadLongPressed(EditorConstants.PADS.get(0)));

        RequestNoteContext req = bus.last(RequestNoteContext.class);
        assertEquals(1, req.cells().size());
        assertEquals(0.5, req.cells().get(0).startBeat());
        assertNull(bus.last(RequestEndNoteContext.class));
        // the released pad goes back to its note color
        assertEquals(EditorColors.NOTE, padColor(bus, EditorConstants.PADS.get(0)));
    }

    @Test
    void releasingTheLastHeldPadEndsTheContext() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        bus.send(new PadLongPressed(EditorConstants.PADS.get(0)));

        assertNotNull(bus.last(RequestEndNoteContext.class));
        assertEquals(EditorColors.NOTE, padColor(bus, EditorConstants.PADS.get(0)));
    }

    @Test
    void redFeedbackIsReassertedAfterAGridRepaint() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        // A velocity turn round-trips to a grid repaint, which would otherwise
        // wipe the red feedback.
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.9)
        )), true));

        assertEquals(EditorColors.ACTIVE_CONTEXT, padColor(bus, EditorConstants.PADS.get(0)));
    }

    @Test
    void ignoresHoldsWhileInPagerMode() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new EditorPagerMode(true)); // grid is now a page picker

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestNoteContext.class));
    }

    @Test
    void enteringPagerModeReleasesAnyHeldContext() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));
        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));
        assertNotNull(bus.last(RequestNoteContext.class));

        bus.send(new EditorPagerMode(true));

        assertNotNull(bus.last(RequestEndNoteContext.class));
    }

    @Test
    void holdingAnUnlitPadDoesNothing() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of());

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestNoteContext.class));
        assertNull(padColor(bus, EditorConstants.PADS.get(0)));
    }

    @Test
    void ignoresHoldsWhenNotOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PadContextCtl(bus);
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)
        )), true));

        bus.send(new PadLongPressStarted(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestNoteContext.class));
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

        assertNull(bus.last(RequestNoteContext.class));
    }

    @Test
    void shortTapNeitherArmsNorEndsTheContext() {
        FakeEventBus bus = new FakeEventBus();
        onEditor(bus, Map.of(0, new EditorSlot(true, 36, 0.0, 0.5, 0.6)));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestNoteContext.class));
        assertNull(bus.last(RequestEndNoteContext.class));
    }
}
