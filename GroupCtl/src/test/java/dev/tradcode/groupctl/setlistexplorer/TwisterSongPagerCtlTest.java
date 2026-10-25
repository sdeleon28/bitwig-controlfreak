package dev.tradcode.groupctl.setlistexplorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.events.TwisterSideButtonPressed;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;

class TwisterSongPagerCtlTest {

    private static FakeEventBus at(int index, int count) {
        FakeEventBus bus = new FakeEventBus();
        new TwisterSongPagerCtl(bus);
        bus.send(new ExplorerModeChanged(true));
        bus.send(new CurrentSongChanged(index, count, "s", 0, false));
        return bus;
    }

    private static TwisterSideButtonClick up(TwisterSideButton b) {
        return new TwisterSideButtonClick(b);
    }

    @Test
    void bottomButtonsStepSongsOnClick() {
        FakeEventBus bus = at(1, 3);
        bus.send(new TwisterSideButtonPressed(TwisterSideButton.BOTTOM_LEFT));
        assertNull(bus.last(RequestSelectSong.class));
        bus.send(up(TwisterSideButton.BOTTOM_LEFT));
        assertEquals(-1, bus.last(RequestSelectSong.class).delta());
        bus.send(up(TwisterSideButton.BOTTOM_RIGHT));
        assertEquals(1, bus.last(RequestSelectSong.class).delta());
    }

    @Test
    void inertPastTheEnds() {
        FakeEventBus bus = at(0, 1);
        bus.send(up(TwisterSideButton.BOTTOM_LEFT), up(TwisterSideButton.BOTTOM_RIGHT));
        assertNull(bus.last(RequestSelectSong.class));
    }

    @Test
    void inertWhilePlaying() {
        FakeEventBus bus = at(1, 3);
        bus.send(new PlaybackUpdate(0, true));
        bus.send(up(TwisterSideButton.BOTTOM_RIGHT));
        assertNull(bus.last(RequestSelectSong.class));
    }

    @Test
    void inertWhenNotInSetlistMode() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterSongPagerCtl(bus);
        bus.send(new CurrentSongChanged(1, 3, "s", 0, false));
        bus.send(up(TwisterSideButton.BOTTOM_RIGHT));
        assertNull(bus.last(RequestSelectSong.class));
    }

    @Test
    void topButtonsAreNotSongPagers() {
        FakeEventBus bus = at(1, 3);
        bus.send(up(TwisterSideButton.TOP_LEFT), up(TwisterSideButton.TOP_RIGHT));
        assertNull(bus.last(RequestSelectSong.class));
    }
}
