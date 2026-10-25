package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonChord;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.events.TwisterSideButtonPressed;
import dev.tradcode.groupctl.events.TwisterSideButtonReleased;

class TwisterSideButtonGesturesTest {
    static final TwisterSideButton BL = TwisterSideButton.BOTTOM_LEFT;
    static final TwisterSideButton BR = TwisterSideButton.BOTTOM_RIGHT;

    private static FakeEventBus gestures() {
        var bus = new FakeEventBus();
        new TwisterSideButtonGestures(bus);
        return bus;
    }

    private static TwisterSideButtonPressed down(TwisterSideButton b) {
        return new TwisterSideButtonPressed(b);
    }

    private static TwisterSideButtonReleased up(TwisterSideButton b) {
        return new TwisterSideButtonReleased(b);
    }

    @Test
    void aLoneButtonClicksOnRelease() {
        var bus = gestures();
        bus.send(down(BL));
        assertEquals(0, bus.count(TwisterSideButtonClick.class));
        bus.send(up(BL));
        assertEquals(BL, bus.last(TwisterSideButtonClick.class).button());
    }

    @Test
    void theChordFiresOnTheSecondPress() {
        var bus = gestures();
        bus.send(down(BL), down(BR));
        var chord = bus.last(TwisterSideButtonChord.class);
        assertEquals(BL, chord.first());
        assertEquals(BR, chord.second());
    }

    @Test
    void chordMatchesEitherPressOrder() {
        var bus = gestures();
        bus.send(down(BR), down(BL));
        assertTrue(bus.last(TwisterSideButtonChord.class).is(BL, BR));
    }

    @Test
    void chordedButtonsNeverClick() {
        var bus = gestures();
        bus.send(down(BL), down(BR), up(BR), up(BL));
        assertEquals(1, bus.count(TwisterSideButtonChord.class));
        assertEquals(0, bus.count(TwisterSideButtonClick.class));
    }

    @Test
    void clicksResumeAfterAChord() {
        var bus = gestures();
        bus.send(down(BL), down(BR), up(BL), up(BR));
        bus.send(down(BR), up(BR));
        assertEquals(BR, bus.last(TwisterSideButtonClick.class).button());
        assertEquals(1, bus.count(TwisterSideButtonClick.class));
    }

    @Test
    void repressingWhileTheOtherIsHeldChordsAgain() {
        var bus = gestures();
        bus.send(down(BL), down(BR), up(BR), down(BR));
        assertEquals(2, bus.count(TwisterSideButtonChord.class));
        bus.send(up(BR), up(BL));
        assertEquals(0, bus.count(TwisterSideButtonClick.class));
    }
}
