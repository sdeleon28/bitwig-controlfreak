package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.explorer.events.RequestClearSelection;
import dev.tradcode.groupctl.explorer.events.RequestSetSelection;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.SideButtonLongPressed;

class SelectionCtlTest {

    private static List<GridSlot> grid() {
        List<GridSlot> slots = new ArrayList<>();
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++)
            slots.add(new GridSlot(false, 0, false, false, i * 4.0, i * 4.0 + 4.0));
        return slots;
    }

    private static FakeEventBus activeCtl() {
        FakeEventBus bus = new FakeEventBus();
        new SelectionCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerGridChanged(grid(), 1, 0));
        return bus;
    }

    @Test
    void idleSideButtonIsRedOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new SelectionCtl(bus);
        bus.send(new PageSelected(1));
        PaintSideButton p = bus.last(PaintSideButton.class);
        assertEquals(SideButton.RECORD_ARM, p.btn());
        assertEquals(ExplorerColors.SELECT_COLOR, p.color());
    }

    @Test
    void clickingRecordArmTogglesSelectionMode() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertTrue(bus.last(SelectionModeChanged.class).active());
        assertEquals(ExplorerColors.WHITE, bus.last(PaintSideButton.class).color());
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
    void firstPadBroadcastsPendingSelectionForFeedback() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));

        bus.send(new PadClicked(81)); // index 0 -> [0,4)

        // The anchor slot is broadcast so the grid lights it up immediately.
        PendingSelectionChanged p = bus.last(PendingSelectionChanged.class);
        assertEquals(0.0, p.startBeat());
        assertEquals(4.0, p.duration());
        assertNull(bus.last(RequestSetSelection.class)); // gesture not yet complete
    }

    @Test
    void completingTheGestureClearsThePendingFeedback() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        bus.send(new PadClicked(81));
        bus.send(new PadClicked(82));

        assertEquals(8.0, bus.last(RequestSetSelection.class).endBeat());
        // The anchor feedback is dropped as the committed selection takes over.
        assertEquals(0.0, bus.last(PendingSelectionChanged.class).duration());
    }

    @Test
    void cancelingSelectionModeMidGestureClearsPendingFeedback() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM)); // enter
        bus.send(new PadClicked(81));                          // anchor set
        bus.send(new SideButtonClick(SideButton.RECORD_ARM)); // exit before finishing
        assertEquals(0.0, bus.last(PendingSelectionChanged.class).duration());
    }

    @Test
    void leavingThePageMidGestureClearsPendingFeedback() {
        FakeEventBus bus = activeCtl();
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        bus.send(new PadClicked(81));
        bus.send(new PageSelected(0));
        assertEquals(0.0, bus.last(PendingSelectionChanged.class).duration());
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
        bus.send(new ExplorerGridChanged(grid(), 1, 0));
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertNull(bus.last(SelectionModeChanged.class));
    }
}
