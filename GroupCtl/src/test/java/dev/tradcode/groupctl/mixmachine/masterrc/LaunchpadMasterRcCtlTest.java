package dev.tradcode.groupctl.mixmachine.masterrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectMaster;

class LaunchpadMasterRcCtlTest {

    static final int PAD = 48;
    static final int WHITE = 3;
    static final int MASTER_ID = BitwigMasterRcTracker.MASTER_ID;

    /** Last paint/blink event targeting the master pad, or null. */
    private static Event lastPadEvent(FakeEventBus bus) {
        Event last = null;
        for (var e : bus.events) {
            if (e instanceof PaintPad pp && pp.n() == PAD) last = e;
            if (e instanceof BlinkPad bp && bp.n() == PAD) last = e;
        }
        return last;
    }

    @Test
    void paintsSolidWhiteOnGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));

        assertEquals(new PaintPad(PAD, WHITE), lastPadEvent(bus));
    }

    @Test
    void clickOnlyRequestsSelectionAndDoesNotSelfActivate() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.clear();

        bus.send(new PadClicked(PAD));

        assertEquals(1, bus.count(RequestSelectMaster.class));
        // the pad must not blink until Bitwig confirms the selection
        assertTrue(bus.events.stream().noneMatch(e -> e instanceof BlinkPad));
    }

    @Test
    void blinksWhenBitwigConfirmsMasterSelected() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.clear();

        bus.send(new BitwigTrackSelected(MASTER_ID));

        assertEquals(new BlinkPad(PAD, WHITE), lastPadEvent(bus));
    }

    @Test
    void revertsToSolidWhenAnotherTrackSelected() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new BitwigTrackSelected(MASTER_ID)); // blinking
        bus.clear();

        bus.send(new BitwigTrackSelected(10));

        assertEquals(new PaintPad(PAD, WHITE), lastPadEvent(bus));
    }

    @Test
    void ignoresClicksWhenOffGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.PROJECT_EXPLORER.getValue()));
        bus.clear();

        bus.send(new PadClicked(PAD));

        assertEquals(0, bus.count(RequestSelectMaster.class));
    }
}
