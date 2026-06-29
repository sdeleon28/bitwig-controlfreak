package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestToggleNoteSelection;
import dev.tradcode.groupctl.editor.events.SelectionModeChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class EditorSelectionCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int EDITOR_BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;
    private static final int OTHER = 0;

    private static EditorSlot unlit() {
        return new EditorSlot(false, 36, 0.0, 0.5);
    }

    private static List<EditorSlot> grid(Map<Integer, EditorSlot> overrides) {
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            slots.add(overrides.getOrDefault(i, unlit()));
        return slots;
    }

    private static FakeEventBus onEditor() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSelectionCtl(bus);
        bus.send(new PageSelected(EDITOR));
        return bus;
    }

    @Test
    void litsTheMixerButtonIdleOnTheEditorPage() {
        FakeEventBus bus = onEditor();
        assertEquals(TopButton.MIXER, bus.last(PaintTopButton.class).btn());
        assertEquals(EditorColors.SELECT_IDLE, bus.last(PaintTopButton.class).color());
    }

    @Test
    void mixerClickEngagesSelectionMode() {
        FakeEventBus bus = onEditor();
        bus.send(new TopButtonClick(TopButton.MIXER));

        assertTrue(bus.last(SelectionModeChanged.class).active());
        assertEquals(EditorColors.SELECT_ACTIVE, bus.last(PaintTopButton.class).color());
    }

    @Test
    void mixerClickAgainDisengagesSelectionMode() {
        FakeEventBus bus = onEditor();
        bus.send(new TopButtonClick(TopButton.MIXER));
        bus.send(new TopButtonClick(TopButton.MIXER));

        assertFalse(bus.last(SelectionModeChanged.class).active());
        assertEquals(EditorColors.SELECT_IDLE, bus.last(PaintTopButton.class).color());
    }

    @Test
    void selectingALitPadTogglesThatNote() {
        FakeEventBus bus = onEditor();
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));
        bus.send(new TopButtonClick(TopButton.MIXER));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        RequestToggleNoteSelection req = bus.last(RequestToggleNoteSelection.class);
        assertEquals(36, req.key());
        assertEquals(0.0, req.startBeat());
        assertEquals(0.5, req.endBeat());
    }

    @Test
    void selectingAnEmptyPadTogglesNothing() {
        FakeEventBus bus = onEditor();
        bus.send(new EditorGridChanged(grid(Map.of()), true));
        bus.send(new TopButtonClick(TopButton.MIXER));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestToggleNoteSelection.class));
    }

    @Test
    void padsDoNotToggleWhenModeIsOff() {
        FakeEventBus bus = onEditor();
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestToggleNoteSelection.class));
    }

    @Test
    void selectionModeWorksOnTheBottomPageToo() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSelectionCtl(bus);
        bus.send(new PageSelected(EDITOR_BOTTOM));
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));
        bus.send(new TopButtonClick(TopButton.MIXER));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertEquals(36, bus.last(RequestToggleNoteSelection.class).key());
    }

    @Test
    void selectionModePersistsAcrossEditorPages() {
        FakeEventBus bus = onEditor();
        bus.send(new TopButtonClick(TopButton.MIXER));

        bus.send(new PageSelected(EDITOR_BOTTOM));

        assertTrue(bus.last(SelectionModeChanged.class).active());
        assertEquals(EditorColors.SELECT_ACTIVE, bus.last(PaintTopButton.class).color());
    }

    @Test
    void leavingTheEditorExitsSelectionModeAndDarkensTheButton() {
        FakeEventBus bus = onEditor();
        bus.send(new TopButtonClick(TopButton.MIXER));

        bus.send(new PageSelected(OTHER));

        assertFalse(bus.last(SelectionModeChanged.class).active());
        assertEquals(0, bus.last(PaintTopButton.class).color());
    }

    @Test
    void ignoresTheMixerButtonOffTheEditorPages() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSelectionCtl(bus);
        bus.send(new PageSelected(OTHER));

        bus.send(new TopButtonClick(TopButton.MIXER));

        assertNull(bus.last(SelectionModeChanged.class));
    }

    @Test
    void pagerModeSuppressesPadToggling() {
        FakeEventBus bus = onEditor();
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0.0, 0.5)
        )), true));
        bus.send(new TopButtonClick(TopButton.MIXER));
        bus.send(new EditorPagerMode(true));

        bus.send(new PadClicked(EditorConstants.PADS.get(0)));

        assertNull(bus.last(RequestToggleNoteSelection.class));
    }
}
