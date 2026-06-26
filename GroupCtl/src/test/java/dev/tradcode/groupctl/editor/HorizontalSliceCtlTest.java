package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class HorizontalSliceCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int COLS = EditorConstants.GRID_COLS;

    // A full grid where every cell carries its row's key and a 1/8-note start
    // beat, unlit unless overridden. Mirrors what the calculator broadcasts so
    // the Ctl reads real keys and beats off the slots.
    private static List<EditorSlot> grid(Map<Integer, EditorSlot> lit) {
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++) {
            if (lit.containsKey(i)) {
                slots.add(lit.get(i));
                continue;
            }
            int row = i / COLS;
            int col = i % COLS;
            double start = col * 0.5;
            slots.add(new EditorSlot(false, GridGeometry.keyForRow(row), start, start + 0.5));
        }
        return slots;
    }

    private static EditorSlot litNote(int key, double startBeat) {
        return new EditorSlot(true, key, startBeat, startBeat + 0.5, 1.0);
    }

    private static <T extends Event> List<T> allOf(FakeEventBus bus, Class<T> type) {
        List<T> out = new ArrayList<>();
        for (Event e : bus.events)
            if (type.isInstance(e))
                out.add(type.cast(e));
        return out;
    }

    private static FakeEventBus onEditorWith(Map<Integer, EditorSlot> lit) {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(lit), true));
        return bus;
    }

    @Test
    void sideButtonSelectsEveryLitNoteInItsRow() {
        // Row 7 (bottom, C1 = 36) maps to the RECORD_ARM side button.
        int row7Key = GridGeometry.keyForRow(7);
        FakeEventBus bus = onEditorWith(Map.of(
            56, litNote(row7Key, 0.0),
            58, litNote(row7Key, 1.0)
        ));

        bus.send(new SideButtonClick(SideButton.RECORD_ARM));

        RequestSelectNotes sel = bus.last(RequestSelectNotes.class);
        assertNotNull(sel);
        assertEquals(2, sel.cells().size());
        assertTrue(sel.cells().stream().allMatch(c -> c.key() == row7Key));
        assertTrue(sel.cells().stream().anyMatch(c -> c.startBeat() == 0.0));
        assertTrue(sel.cells().stream().anyMatch(c -> c.startBeat() == 1.0));
        assertEquals(0, bus.count(BlinkPad.class));
    }

    @Test
    void stopButtonMapsToRowFour() {
        // STOP sits fifth from the top, so it now drives grid row 4.
        int row4Key = GridGeometry.keyForRow(4);
        FakeEventBus bus = onEditorWith(Map.of(32, litNote(row4Key, 0.0)));

        bus.send(new SideButtonClick(SideButton.STOP));

        RequestSelectNotes sel = bus.last(RequestSelectNotes.class);
        assertNotNull(sel);
        assertEquals(1, sel.cells().size());
        assertEquals(row4Key, sel.cells().get(0).key());
    }

    @Test
    void sideButtonOnAnEmptyRowBlinksAllItsPads() {
        FakeEventBus bus = onEditorWith(Map.of());

        bus.send(new SideButtonClick(SideButton.VOLUME)); // top row, row 0

        List<BlinkPad> blinks = allOf(bus, BlinkPad.class);
        assertEquals(COLS, blinks.size());
        for (int col = 0; col < COLS; col++) {
            assertEquals(EditorConstants.PADS.get(col).intValue(), blinks.get(col).n());
            assertEquals(EditorColors.SLICE_FILL, blinks.get(col).color());
        }
        assertNull(bus.last(RequestSelectNotes.class));
        assertNull(bus.last(RequestSetNote.class));
    }

    @Test
    void tappingABlinkingPadFillsTheWholeRowAtTheCurrentResolution() {
        FakeEventBus bus = onEditorWith(Map.of());
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm row 0

        bus.send(new PadClicked(EditorConstants.PADS.get(3))); // any pad in row 0

        List<RequestSetNote> sets = allOf(bus, RequestSetNote.class);
        assertEquals(COLS, sets.size());
        int row0Key = GridGeometry.keyForRow(0);
        for (int col = 0; col < COLS; col++) {
            assertEquals(row0Key, sets.get(col).key());
            assertEquals(col * 0.5, sets.get(col).beat());
        }
    }

    @Test
    void filledNotesStaySelected() {
        FakeEventBus bus = onEditorWith(Map.of());
        bus.send(new SideButtonClick(SideButton.VOLUME));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        // The selection request is the final word, so the fresh row stays lit red.
        Event lastSelectOrSet = bus.events.get(bus.events.size() - 1);
        assertTrue(lastSelectOrSet instanceof RequestSelectNotes);
        RequestSelectNotes sel = (RequestSelectNotes) lastSelectOrSet;
        assertEquals(COLS, sel.cells().size());
    }

    @Test
    void tappingOutsideTheArmedRowCancelsWithoutFilling() {
        FakeEventBus bus = onEditorWith(Map.of());
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm row 0

        bus.send(new PadClicked(EditorConstants.PADS.get(56))); // row 7 pad

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
        assertEquals(0, bus.count(RequestSetNote.class));
    }

    @Test
    void pressingTheArmedRowButtonAgainCancelsTheBlink() {
        FakeEventBus bus = onEditorWith(Map.of());
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm
        long blinksAfterArm = bus.count(BlinkPad.class);

        bus.send(new SideButtonClick(SideButton.VOLUME)); // cancel

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
        assertEquals(blinksAfterArm, bus.count(BlinkPad.class));
    }

    @Test
    void selectingAPopulatedRowDropsAnExistingBlink() {
        int row7Key = GridGeometry.keyForRow(7);
        FakeEventBus bus = onEditorWith(Map.of(56, litNote(row7Key, 0.0)));
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm empty row 0

        bus.send(new SideButtonClick(SideButton.RECORD_ARM)); // row 7 has a note

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
        assertEquals(1, bus.last(RequestSelectNotes.class).cells().size());
    }

    @Test
    void ignoresSideButtonsWhenNoClipExists() {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorGridChanged(grid(Map.of()), false)); // no clip

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void ignoresSideButtonsOffTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new EditorGridChanged(grid(Map.of()), true));

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
    }

    @Test
    void ignoresSideButtonsWhileInPagerMode() {
        FakeEventBus bus = onEditorWith(Map.of());
        bus.send(new EditorPagerMode(true));

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
    }
}
