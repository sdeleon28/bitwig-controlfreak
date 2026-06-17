package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.TransportTogglesUpdate;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class TransportTogglesCtlTest {

    /** The last paint targeting the given side button, or null if none. */
    private static PaintSideButton lastPaint(FakeEventBus bus, SideButton btn) {
        PaintSideButton last = null;
        for (var e : bus.events)
            if (e instanceof PaintSideButton p && p.btn() == btn) last = p;
        return last;
    }

    @Test
    void muteRequestsLoopOnWhenLoopOff() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new SideButtonClick(SideButton.MUTE));
        assertEquals(true, bus.last(RequestSetLoop.class).enabled());
    }

    @Test
    void muteRequestsLoopOffWhenLoopOn() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new TransportTogglesUpdate(true, false));

        bus.send(new SideButtonClick(SideButton.MUTE));
        assertEquals(false, bus.last(RequestSetLoop.class).enabled());
    }

    @Test
    void soloRequestsMetronomeOnWhenOff() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new SideButtonClick(SideButton.SOLO));
        assertEquals(true, bus.last(RequestSetMetronome.class).enabled());
    }

    @Test
    void soloRequestsMetronomeOffWhenOn() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new TransportTogglesUpdate(false, true));

        bus.send(new SideButtonClick(SideButton.SOLO));
        assertEquals(false, bus.last(RequestSetMetronome.class).enabled());
    }

    @Test
    void ignoresButtonsWhenNotOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);

        bus.send(new SideButtonClick(SideButton.MUTE));
        bus.send(new SideButtonClick(SideButton.SOLO));
        assertNull(bus.last(RequestSetLoop.class));
        assertNull(bus.last(RequestSetMetronome.class));
    }

    @Test
    void litsLoopCyanAndMetronomeYellowWhenEnabled() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new TransportTogglesUpdate(true, true));
        assertEquals(ExplorerColors.LOOP_COLOR, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(ExplorerColors.METRONOME_COLOR, lastPaint(bus, SideButton.SOLO).color());
    }

    @Test
    void darkensTogglesWhenDisabled() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new TransportTogglesUpdate(true, true));
        bus.send(new TransportTogglesUpdate(false, false));
        assertEquals(0, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(0, lastPaint(bus, SideButton.SOLO).color());
    }

    @Test
    void doesNotPaintWhileOffPage() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);

        // Never entered the explorer page; the Pager owns clearing.
        bus.send(new TransportTogglesUpdate(true, true));
        assertNull(lastPaint(bus, SideButton.MUTE));
        assertNull(lastPaint(bus, SideButton.SOLO));
    }

    @Test
    void repaintsFromCacheOnPageEntry() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new TransportTogglesUpdate(true, false)); // cached while off-page

        bus.send(new PageSelected(1));
        assertEquals(ExplorerColors.LOOP_COLOR, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(0, lastPaint(bus, SideButton.SOLO).color());
    }
}
