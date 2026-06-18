package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.RequestSetRecord;
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
        bus.send(new TransportTogglesUpdate(true, false, false));

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
        bus.send(new TransportTogglesUpdate(false, true, false));

        bus.send(new SideButtonClick(SideButton.SOLO));
        assertEquals(false, bus.last(RequestSetMetronome.class).enabled());
    }

    @Test
    void recordRequestsRecordOnWhenOff() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertEquals(true, bus.last(RequestSetRecord.class).enabled());
    }

    @Test
    void recordRequestsRecordOffWhenOn() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new TransportTogglesUpdate(false, false, true));

        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertEquals(false, bus.last(RequestSetRecord.class).enabled());
    }

    @Test
    void ignoresButtonsWhenNotOnExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);

        bus.send(new SideButtonClick(SideButton.MUTE));
        bus.send(new SideButtonClick(SideButton.SOLO));
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));
        assertNull(bus.last(RequestSetLoop.class));
        assertNull(bus.last(RequestSetMetronome.class));
        assertNull(bus.last(RequestSetRecord.class));
    }

    @Test
    void litsLoopCyanMetronomeYellowRecordRedWhenEnabled() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new TransportTogglesUpdate(true, true, true));
        assertEquals(ExplorerColors.LOOP_COLOR, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(ExplorerColors.METRONOME_COLOR, lastPaint(bus, SideButton.SOLO).color());
        assertEquals(ExplorerColors.RECORD_COLOR, lastPaint(bus, SideButton.RECORD_ARM).color());
    }

    @Test
    void darkensTogglesWhenDisabled() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(new TransportTogglesUpdate(true, true, true));
        bus.send(new TransportTogglesUpdate(false, false, false));
        assertEquals(0, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(0, lastPaint(bus, SideButton.SOLO).color());
        assertEquals(0, lastPaint(bus, SideButton.RECORD_ARM).color());
    }

    @Test
    void doesNotPaintWhileOffPage() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);

        // Never entered the explorer page; the Pager owns clearing.
        bus.send(new TransportTogglesUpdate(true, true, true));
        assertNull(lastPaint(bus, SideButton.MUTE));
        assertNull(lastPaint(bus, SideButton.SOLO));
        assertNull(lastPaint(bus, SideButton.RECORD_ARM));
    }

    @Test
    void repaintsFromCacheOnPageEntry() {
        FakeEventBus bus = new FakeEventBus();
        new TransportTogglesCtl(bus);
        bus.send(new TransportTogglesUpdate(true, false, true)); // cached while off-page

        bus.send(new PageSelected(1));
        assertEquals(ExplorerColors.LOOP_COLOR, lastPaint(bus, SideButton.MUTE).color());
        assertEquals(0, lastPaint(bus, SideButton.SOLO).color());
        assertEquals(ExplorerColors.RECORD_COLOR, lastPaint(bus, SideButton.RECORD_ARM).color());
    }
}
