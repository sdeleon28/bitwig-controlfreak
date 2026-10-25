package dev.tradcode.groupctl.guitarinput;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.events.TwisterSideButtonPressed;
import dev.tradcode.groupctl.guitarinput.events.RequestArmGuitars;

class GuitarInputCtlTest {
    @Test
    void topLeftClickArmsGuitars() {
        var bus = new FakeEventBus();
        new GuitarInputCtl(bus);
        bus.send(new TwisterSideButtonPressed(TwisterSideButton.TOP_LEFT));
        assertEquals(0, bus.count(RequestArmGuitars.class));
        bus.send(new TwisterSideButtonClick(TwisterSideButton.TOP_LEFT));
        assertEquals(1, bus.count(RequestArmGuitars.class));
    }

    @Test
    void otherSideButtonsDoNothing() {
        var bus = new FakeEventBus();
        new GuitarInputCtl(bus);
        bus.send(
            new TwisterSideButtonClick(TwisterSideButton.TOP_RIGHT),
            new TwisterSideButtonClick(TwisterSideButton.BOTTOM_LEFT),
            new TwisterSideButtonClick(TwisterSideButton.BOTTOM_RIGHT));
        assertEquals(0, bus.count(RequestArmGuitars.class));
    }
}
