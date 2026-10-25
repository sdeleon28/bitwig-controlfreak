package dev.tradcode.groupctl.tones;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.events.TwisterSideButtonPressed;
import dev.tradcode.groupctl.tones.events.RequestToggleTuner;

class TwisterTunerCtlTest {
    @Test
    void topRightClickTogglesTheTuner() {
        var bus = new FakeEventBus();
        new TwisterTunerCtl(bus);
        bus.send(new TwisterSideButtonPressed(TwisterSideButton.TOP_RIGHT));
        assertEquals(0, bus.count(RequestToggleTuner.class));
        bus.send(new TwisterSideButtonClick(TwisterSideButton.TOP_RIGHT));
        assertEquals(1, bus.count(RequestToggleTuner.class));
    }

    @Test
    void otherSideButtonsDoNotToggleTheTuner() {
        var bus = new FakeEventBus();
        new TwisterTunerCtl(bus);
        bus.send(
            new TwisterSideButtonClick(TwisterSideButton.TOP_LEFT),
            new TwisterSideButtonClick(TwisterSideButton.BOTTOM_LEFT),
            new TwisterSideButtonClick(TwisterSideButton.BOTTOM_RIGHT));
        assertEquals(0, bus.count(RequestToggleTuner.class));
    }
}
