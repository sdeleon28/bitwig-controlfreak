package dev.tradcode.groupctl.mixmachine.masterrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;

class LaunchpadMasterRcCtlTest {

    static final int PAD = 48;
    static final int WHITE = 3;

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
    void clickSelectsBlinksAndAnnounces() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.clear();

        bus.send(new PadClicked(PAD));

        assertEquals(1, bus.count(MasterRcSelected.class));
        assertEquals(new BlinkPad(PAD, WHITE), lastPadEvent(bus));
    }

    @Test
    void selectingATrackRevertsToSolid() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new PadClicked(PAD)); // selected -> blinking
        bus.clear();

        bus.send(new RequestSelectTrack(11, "bass (1)"));

        assertEquals(new PaintPad(PAD, WHITE), lastPadEvent(bus));
    }

    @Test
    void ignoresClicksWhenOffGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadMasterRcCtl(bus);
        bus.send(new PageSelected(Page.PROJECT_EXPLORER.getValue()));
        bus.clear();

        bus.send(new PadClicked(PAD));

        assertEquals(0, bus.count(MasterRcSelected.class));
    }
}
