package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.VolModeSelected;

class VolPanCtlTest {

    private static long modeSelections(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof VolModeSelected || e instanceof PanModeSelected)
            .count();
    }

    @Test
    void sideButtonSelectsModeWhilePageActive() {
        FakeEventBus bus = new FakeEventBus();
        new VolPanCtl(bus);
        bus.events.clear();

        bus.send(new SideButtonClick(SideButton.PAN));

        assertTrue(bus.events.stream().anyMatch(e -> e instanceof PanModeSelected));
    }

    @Test
    void ignoresSideButtonsWhilePageInactive() {
        FakeEventBus bus = new FakeEventBus();
        new VolPanCtl(bus);
        bus.send(new PageSelected(1)); // explorer page
        bus.events.clear();

        bus.send(new SideButtonClick(SideButton.VOLUME));
        bus.send(new SideButtonClick(SideButton.PAN));

        assertEquals(0, modeSelections(bus));
    }

    @Test
    void resumesHandlingSideButtonsWhenPageReactivated() {
        FakeEventBus bus = new FakeEventBus();
        new VolPanCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new SideButtonClick(SideButton.PAN)); // ignored
        bus.send(new PageSelected(0)); // back to mixmachine
        bus.events.clear();

        bus.send(new SideButtonClick(SideButton.VOLUME));

        assertTrue(bus.events.stream().anyMatch(e -> e instanceof VolModeSelected));
    }
}
