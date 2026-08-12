package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.explorer.events.RequestStopPlayback;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class PlaybackHandlerTest {

    /** A grid where pad index i maps to beat i*4. */
    private static List<GridSlot> grid() {
        List<GridSlot> slots = new ArrayList<>();
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++)
            slots.add(new GridSlot(false, 0, false, false, i * 4.0, i * 4.0 + 4.0));
        return slots;
    }

    @Test
    void padPressSeeksToThePadBeat() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerGridChanged(grid(), 1, 0));

        bus.send(new PadClicked(71)); // pad index 8 -> beat 32
        assertEquals(32.0, bus.last(RequestSetPlaybackPosition.class).beat());
    }

    @Test
    void doesNotSeekWhileSelecting() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerGridChanged(grid(), 1, 0));
        bus.send(new SelectionModeChanged(true));

        bus.send(new PadClicked(81));
        assertNull(bus.last(RequestSetPlaybackPosition.class));
    }

    @Test
    void doesNotSeekOnEmptySlot() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));
        List<GridSlot> g = grid();
        g.set(0, new GridSlot(true, 0, false, false, 0, 0)); // pad 81 empty
        bus.send(new ExplorerGridChanged(g, 1, 0));

        bus.send(new PadClicked(81));
        assertNull(bus.last(RequestSetPlaybackPosition.class));
    }

    @Test
    void ignoresPadsWhenNotOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new ExplorerGridChanged(grid(), 1, 0));
        bus.send(new PadClicked(81));
        assertNull(bus.last(RequestSetPlaybackPosition.class));
    }

    @Test
    void stopSideButtonStopsPlayback() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNotNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void stopSideButtonStopsEvenWhileSelecting() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));
        bus.send(new SelectionModeChanged(true));

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNotNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void ignoresStopSideButtonWhenNotOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void ignoresOtherSideButtons() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));

        bus.send(new SideButtonClick(SideButton.MUTE));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void litsStopButtonWhilePlayingOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(1));

        bus.send(new PlaybackUpdate(0, true));
        PaintSideButton lit = bus.last(PaintSideButton.class);
        assertNotNull(lit);
        assertEquals(SideButton.STOP, lit.btn());
        assertEquals(ExplorerColors.STOP_COLOR, lit.color());
    }

    @Test
    void doesNotLightStopButtonOffPageEvenWhilePlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        // Never entered the explorer page.
        bus.send(new PlaybackUpdate(0, true));
        assertNull(bus.last(PaintSideButton.class));
    }
}
