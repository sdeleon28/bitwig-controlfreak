package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestClearNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;

class EditorNoteHandlerTest {

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

    @Test
    void litPadClearsEveryOnsetInTheCell() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        RequestClearNotes req = bus.last(RequestClearNotes.class);
        assertEquals(36, req.key());
        assertEquals(0.0, req.startBeat());
        assertEquals(0.5, req.endBeat());
        assertNull(bus.last(RequestSetNote.class));
    }

    @Test
    void unlitPadCreatesANoteAtTheCellStart() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of(
            1, new EditorSlot(false, 36, 0.5, 1.0)
        )), true));

        bus.send(new PadClicked(EditorConstants.PADS.get(1)));

        RequestSetNote req = bus.last(RequestSetNote.class);
        assertEquals(36, req.key());
        assertEquals(0.5, req.beat());
        assertNull(bus.last(RequestClearNotes.class));
    }

    @Test
    void mapsThePadToItsGridSlot() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new PageSelected(EDITOR));
        // Index 8 is row 1 (C#1 = 37), column 0.
        bus.send(new EditorGridChanged(grid(Map.of(
            8, new EditorSlot(true, 37, 0.0, 0.5)
        )), true));

        bus.send(new PadClicked(EditorConstants.PADS.get(8)));
        assertEquals(37, bus.last(RequestClearNotes.class).key());
    }

    @Test
    void doesNothingWhenNoClipIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), false)); // clip does not exist

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));
        assertNull(bus.last(RequestClearNotes.class));
        assertNull(bus.last(RequestSetNote.class));
    }

    @Test
    void ignoresPadsWhileInPagerMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));
        bus.send(new EditorPagerMode(true)); // grid is now a page picker

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestClearNotes.class));
        assertNull(bus.last(RequestSetNote.class));
    }

    @Test
    void ignoresPadsWhenNotOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorNoteHandler(bus);
        bus.send(new EditorGridChanged(grid(Map.of()), true));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));
        assertNull(bus.last(RequestSetNote.class));
    }
}
