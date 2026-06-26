package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNotes;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

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

    private static int[] chromaticRowKeys() {
        int[] keys = new int[EditorConstants.GRID_ROWS];
        for (int r = 0; r < keys.length; r++)
            keys[r] = GridGeometry.keyForRow(r); // top row first, matching the side buttons
        return keys;
    }

    private static EditorNote note(int key, double beat) {
        return new EditorNote(key, beat, 1.0, false);
    }

    private static <T extends Event> List<T> allOf(FakeEventBus bus, Class<T> type) {
        List<T> out = new ArrayList<>();
        for (Event e : bus.events)
            if (type.isInstance(e))
                out.add(type.cast(e));
        return out;
    }

    private static FakeEventBus onEditor(double lengthBeats, int denominator, List<EditorNote> notes) {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorRowKeysChanged(chromaticRowKeys()));
        bus.send(new EditorResolutionChanged(denominator));
        bus.send(new EditorClipChanged(true, lengthBeats, notes));
        return bus;
    }

    @Test
    void sideButtonSelectsEveryNoteOnThatKeyAcrossTheWholeClip() {
        int row7Key = GridGeometry.keyForRow(7); // bottom row, RECORD_ARM
        // Notes sit far past the page the grid shows (4 beats at 1/8); selection
        // must still reach them. A note on a different key must be left alone.
        FakeEventBus bus = onEditor(32.0, 8, List.of(
            note(row7Key, 0.0),
            note(row7Key, 8.0),
            note(row7Key, 30.0),
            note(GridGeometry.keyForRow(0), 2.0)
        ));

        bus.send(new SideButtonClick(SideButton.RECORD_ARM));

        RequestSelectNotes sel = bus.last(RequestSelectNotes.class);
        assertNotNull(sel);
        assertEquals(3, sel.cells().size());
        assertTrue(sel.cells().stream().allMatch(c -> c.key() == row7Key));
        assertTrue(sel.cells().stream().anyMatch(c -> c.startBeat() == 30.0));
        assertEquals(0, bus.count(BlinkPad.class));
    }

    @Test
    void stopButtonMapsToRowFour() {
        int row4Key = GridGeometry.keyForRow(4);
        FakeEventBus bus = onEditor(8.0, 8, List.of(note(row4Key, 0.0)));

        bus.send(new SideButtonClick(SideButton.STOP));

        RequestSelectNotes sel = bus.last(RequestSelectNotes.class);
        assertNotNull(sel);
        assertEquals(1, sel.cells().size());
        assertEquals(row4Key, sel.cells().get(0).key());
    }

    @Test
    void sideButtonOnAnEmptyKeyBlinksAllPadsInItsRow() {
        FakeEventBus bus = onEditor(8.0, 8, List.of());

        bus.send(new SideButtonClick(SideButton.VOLUME)); // top row, row 0

        List<BlinkPad> blinks = allOf(bus, BlinkPad.class);
        assertEquals(COLS, blinks.size());
        for (int col = 0; col < COLS; col++) {
            assertEquals(EditorConstants.PADS.get(col).intValue(), blinks.get(col).n());
            assertEquals(EditorColors.SLICE_FILL, blinks.get(col).color());
        }
        assertNull(bus.last(RequestSelectNotes.class));
        assertNull(bus.last(RequestSetNotes.class));
    }

    @Test
    void tappingABlinkingPadFillsTheWholeClipAtTheCurrentResolution() {
        FakeEventBus bus = onEditor(8.0, 8, List.of()); // 8 beats, 1/8 -> 0.5 beat step
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm row 0

        bus.send(new PadClicked(EditorConstants.PADS.get(3))); // any pad in row 0

        RequestSetNotes set = bus.last(RequestSetNotes.class);
        assertNotNull(set);
        assertEquals(16, set.cells().size()); // 8 beats / 0.5
        int row0Key = GridGeometry.keyForRow(0);
        assertTrue(set.cells().stream().allMatch(c -> c.key() == row0Key));
        assertEquals(0.0, set.cells().get(0).startBeat());
        assertEquals(7.5, set.cells().get(15).startBeat());
    }

    @Test
    void fillSpanIsCappedAtTheReadWindow() {
        // A clip far longer than the read window only fills what the window covers.
        FakeEventBus bus = onEditor(200.0, 4, List.of()); // 1/4 -> 1 beat step
        bus.send(new SideButtonClick(SideButton.VOLUME));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        RequestSetNotes set = bus.last(RequestSetNotes.class);
        assertEquals((int) EditorConstants.READ_BEATS, set.cells().size()); // 64 beats at 1 each
    }

    @Test
    void filledNotesStaySelected() {
        FakeEventBus bus = onEditor(8.0, 8, List.of());
        bus.send(new SideButtonClick(SideButton.VOLUME));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        // The select request is the last word so the new row ends up lit red, and
        // it covers exactly the notes we just created.
        Event last = bus.events.get(bus.events.size() - 1);
        assertTrue(last instanceof RequestSelectNotes);
        assertEquals(16, ((RequestSelectNotes) last).cells().size());
    }

    @Test
    void tappingOutsideTheArmedRowCancelsWithoutFilling() {
        FakeEventBus bus = onEditor(8.0, 8, List.of());
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm row 0

        bus.send(new PadClicked(EditorConstants.PADS.get(56))); // row 7 pad

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
        assertEquals(0, bus.count(RequestSetNotes.class));
    }

    @Test
    void pressingTheArmedRowButtonAgainCancelsTheBlink() {
        FakeEventBus bus = onEditor(8.0, 8, List.of());
        bus.send(new SideButtonClick(SideButton.VOLUME)); // arm
        long blinksAfterArm = bus.count(BlinkPad.class);

        bus.send(new SideButtonClick(SideButton.VOLUME)); // cancel

        assertNotNull(bus.last(RequestEditorGridRepaint.class));
        assertEquals(blinksAfterArm, bus.count(BlinkPad.class));
    }

    @Test
    void selectingAPopulatedRowDropsAnExistingBlink() {
        int row7Key = GridGeometry.keyForRow(7);
        FakeEventBus bus = onEditor(8.0, 8, List.of(note(row7Key, 0.0)));
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
        bus.send(new EditorRowKeysChanged(chromaticRowKeys()));
        bus.send(new EditorClipChanged(false, 8.0, List.of())); // no clip

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
        assertNull(bus.last(RequestSelectNotes.class));
    }

    @Test
    void ignoresSideButtonsOffTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new EditorRowKeysChanged(chromaticRowKeys()));
        bus.send(new EditorClipChanged(true, 8.0, List.of()));

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
    }

    @Test
    void ignoresSideButtonsWhileInPagerMode() {
        FakeEventBus bus = onEditor(8.0, 8, List.of());
        bus.send(new EditorPagerMode(true));

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
    }

    @Test
    void ignoresSideButtonsBeforeAMapperHasSetRowKeys() {
        FakeEventBus bus = new FakeEventBus();
        new HorizontalSliceCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 8.0, List.of())); // no EditorRowKeysChanged yet

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertEquals(0, bus.count(BlinkPad.class));
        assertNull(bus.last(RequestSelectNotes.class));
    }
}
