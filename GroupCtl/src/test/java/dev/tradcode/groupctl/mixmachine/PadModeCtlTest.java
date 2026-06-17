package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadMode;
import dev.tradcode.groupctl.events.PadModeUpdated;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class PadModeCtlTest {

    /** The last pad mode broadcast on the bus, or null if none. */
    private static PadMode lastMode(FakeEventBus bus) {
        PadMode mode = null;
        for (var e : bus.events)
            if (e instanceof PadModeUpdated u) mode = u.mode();
        return mode;
    }

    private static long modeUpdates(FakeEventBus bus) {
        return bus.events.stream().filter(e -> e instanceof PadModeUpdated).count();
    }

    @Test
    void sideButtonSelectsModeWhilePageActive() {
        FakeEventBus bus = new FakeEventBus();
        new PadModeCtl(bus);

        bus.send(new SideButtonClick(SideButton.MUTE));

        assertEquals(PadMode.MUTE, lastMode(bus));
    }

    @Test
    void ignoresSideButtonsWhilePageInactive() {
        FakeEventBus bus = new FakeEventBus();
        new PadModeCtl(bus);
        bus.send(new PageSelected(1)); // explorer page
        bus.events.clear();

        bus.send(new SideButtonClick(SideButton.MUTE));
        bus.send(new SideButtonClick(SideButton.STOP));
        bus.send(new SideButtonClick(SideButton.RECORD_ARM));

        assertEquals(0, modeUpdates(bus));
    }

    @Test
    void resumesHandlingSideButtonsWhenPageReactivated() {
        FakeEventBus bus = new FakeEventBus();
        new PadModeCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new SideButtonClick(SideButton.MUTE)); // ignored
        bus.send(new PageSelected(0)); // back to mixmachine
        bus.events.clear();

        bus.send(new SideButtonClick(SideButton.SOLO));

        assertEquals(PadMode.SOLO, lastMode(bus));
    }
}
