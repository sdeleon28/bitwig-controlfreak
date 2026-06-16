package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.events.ExplorerGridChanged;
import dev.tradcode.groupctl.events.GridSlot;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.RequestClearSelection;
import dev.tradcode.groupctl.events.RequestSetSelection;
import dev.tradcode.groupctl.events.SelectionModeChanged;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.SideButtonLongPressed;

class SelectionCtlTest {

    private static List<GridSlot> grid() {
        List<GridSlot> slots = new ArrayList<>();
        for (int i = 0; i < ExplorerPads.PAGE_SIZE; i++)
            slots.add(new GridSlot(false, i * 4.0, i * 4.0 + 4.0));
        return slots;
    }

    private static FakeEventBus activeCtl() {
        FakeEventBus bus = new FakeEventBus();
        new SelectionCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerGridChanged(grid()));
        return bus;
    }

    @Test
    void idleSideButtonIsRedOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new SelectionCtl(bus);
        bus.send(new PageSelected(1));
        PaintSideButton p = bus.last(PaintSideButton.class);
        assertEquals(SideButton.RECORD_ARM, p.btn());
        assertEquals(Colors.EXPLORER_SELECT_COLOR, p.color());
    }

    @Test
    void clickingRecordArmTogglesSelectionMode() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertTrue(bus.last(SelectionModeChanged.class).active());
        assertEquals(Colors.WHITE, bus.last(PaintSideButton.class).color());
    }

    @Test
    void twoPadsDefineASelection() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));

        bus.send(new PadClicked(81)); // index 0 -> [0,4)
        assertNull(bus.last(RequestSetSelection.class)); // first press only stores

        bus.send(new PadClicked(82)); // index 1 -> [4,8)
        RequestSetSelection sel = bus.last(RequestSetSelection.class);
        assertEquals(0.0, sel.startBeat());
        assertEquals(8.0, sel.endBeat());
        // Mode exits after completing the gesture.
        assertEquals(false, bus.last(SelectionModeChanged.class).active());
    }

    @Test
    void selectionIsOrderIndependent() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        bus.send(new PadClicked(82)); // [4,8)
        bus.send(new PadClicked(81)); // [0,4)
        RequestSetSelection sel = bus.last(RequestSetSelection.class);
        assertEquals(0.0, sel.startBeat());
        assertEquals(8.0, sel.endBeat());
    }

    @Test
    void longPressClearsSelection() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonLongPressed(SideButton.RECORD_ARM));
        assertEquals(1, bus.count(RequestClearSelection.class));
        assertEquals(false, bus.last(SelectionModeChanged.class).active());
    }

    @Test
    void ignoresInteractionsOffTheExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new SelectionCtl(bus);
        bus.send(new ExplorerGridChanged(grid()));
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertNull(bus.last(SelectionModeChanged.class));
    }
}
