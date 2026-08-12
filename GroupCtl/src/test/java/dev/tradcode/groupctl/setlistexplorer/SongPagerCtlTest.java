package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class SongPagerCtlTest {

    private static int lastTopColor(FakeEventBus bus, TopButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintTopButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    /** Engaged, on page, showing song `index` of `count`, stopped. */
    private static FakeEventBus at(int index, int count) {
        FakeEventBus bus = new FakeEventBus();
        new SongPagerCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerModeChanged(true));
        bus.send(new CurrentSongChanged(index, count, "s", 0, false));
        return bus;
    }

    @Test
    void steppingSongsFromTheMiddle() {
        FakeEventBus bus = at(1, 3);
        bus.send(new TopButtonClick(TopButton.LEFT));
        assertEquals(-1, bus.last(RequestSelectSong.class).delta());
        bus.send(new TopButtonClick(TopButton.RIGHT));
        assertEquals(1, bus.last(RequestSelectSong.class).delta());
    }

    @Test
    void litCyanWhenANeighbourExists() {
        FakeEventBus bus = at(1, 3);
        assertEquals(SetlistColors.PAGER, lastTopColor(bus, TopButton.LEFT));
        assertEquals(SetlistColors.PAGER, lastTopColor(bus, TopButton.RIGHT));
    }

    @Test
    void darkAndInertAtTheEnds() {
        FakeEventBus bus = at(0, 3);
        assertEquals(0, lastTopColor(bus, TopButton.LEFT)); // no previous
        bus.send(new TopButtonClick(TopButton.LEFT));
        assertNull(bus.last(RequestSelectSong.class));
    }

    @Test
    void disabledWhilePlaying() {
        FakeEventBus bus = at(1, 3);
        bus.send(new PlaybackUpdate(0, true));
        assertEquals(0, lastTopColor(bus, TopButton.LEFT));
        assertEquals(0, lastTopColor(bus, TopButton.RIGHT));

        bus.send(new TopButtonClick(TopButton.RIGHT));
        assertNull(bus.last(RequestSelectSong.class)); // auto-follow owns switching now
    }

    @Test
    void inertWhenNotInSetlistMode() {
        FakeEventBus bus = new FakeEventBus();
        new SongPagerCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new CurrentSongChanged(1, 3, "s", 0, false)); // never engaged
        bus.send(new TopButtonClick(TopButton.LEFT));
        assertNull(bus.last(RequestSelectSong.class));
    }
}
