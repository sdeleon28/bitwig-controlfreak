package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ContentBarsChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.baseexplorer.events.RequestSeek;
import dev.tradcode.groupctl.baseexplorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;
import dev.tradcode.groupctl.setlistexplorer.events.SetlistChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class SetlistGridCalculatorTest {

    static final String GREEN = "0,156,68";
    static final String RED = "216,46,34";

    /** Two songs: A over [0,16), B over [20,36). */
    private static MarkersChanged twoSongs() {
        return new MarkersChanged(List.of(
            new Marker(0, GREEN, "{ a"), new Marker(16, "0,0,0", "}"),
            new Marker(20, RED, "{ b"), new Marker(36, "0,0,0", "}")));
    }

    /** Engaged and on the explorer page, showing the first song of twoSongs(). */
    private static FakeEventBus engaged() {
        FakeEventBus bus = new FakeEventBus();
        new SetlistGridCalculator(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerModeChanged(true));
        bus.send(twoSongs());
        return bus;
    }

    @Test
    void staysSilentUntilEngaged() {
        FakeEventBus bus = new FakeEventBus();
        new SetlistGridCalculator(bus);
        bus.send(new PageSelected(1));
        bus.send(twoSongs()); // no ExplorerModeChanged(true)
        assertNull(bus.last(ExplorerGridChanged.class));
    }

    @Test
    void showsTheFirstSongOnlyWhenEngaged() {
        FakeEventBus bus = engaged();
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(0.0, grid.slots().get(0).startBeat());
        assertEquals(87, grid.slots().get(0).color());      // song A is green
        assertFalse(grid.slots().get(3).empty());           // 4 bars of song A
        assertTrue(grid.slots().get(4).empty());            // then nothing
    }

    @Test
    void publishesTheSetlistAndCurrentSong() {
        FakeEventBus bus = engaged();
        assertEquals(List.of("a", "b"), bus.last(SetlistChanged.class).songNames());
        CurrentSongChanged song = bus.last(CurrentSongChanged.class);
        assertEquals(0, song.index());
        assertEquals(2, song.count());
        assertEquals("a", song.name());
    }

    @Test
    void reportsTheCurrentSongsBarCount() {
        FakeEventBus bus = engaged();
        assertEquals(4, bus.last(ContentBarsChanged.class).bars()); // song A is 4 bars
    }

    @Test
    void followsThePlayheadAcrossSongBoundariesWhilePlaying() {
        FakeEventBus bus = engaged();
        bus.send(new PlaybackUpdate(24, true)); // beat 24 is inside song B

        CurrentSongChanged song = bus.last(CurrentSongChanged.class);
        assertEquals(1, song.index());
        assertFalse(song.manual());                          // auto-follow, no growl
        assertEquals(20.0, bus.last(ExplorerGridChanged.class).slots().get(0).startBeat());
    }

    @Test
    void manualNextSeeksToTheSongStartAndMarksItManual() {
        FakeEventBus bus = engaged();
        bus.send(new RequestSelectSong(1));

        CurrentSongChanged song = bus.last(CurrentSongChanged.class);
        assertEquals(1, song.index());
        assertTrue(song.manual());                           // worth a growl
        assertEquals(20.0, bus.last(RequestSeek.class).beat());
        assertNull(bus.last(RequestSetPlaybackPosition.class));  // must not start playback
        assertEquals(20.0, bus.last(ExplorerGridChanged.class).slots().get(0).startBeat());
    }

    @Test
    void manualStepDoesNothingPastTheLastSong() {
        FakeEventBus bus = engaged();
        bus.send(new RequestSelectSong(1)); // -> song B (last)
        long seeks = bus.count(RequestSeek.class);
        bus.send(new RequestSelectSong(1)); // no further song
        assertEquals(seeks, bus.count(RequestSeek.class));
        assertEquals(1, bus.last(CurrentSongChanged.class).index());
    }

    @Test
    void pagesBarsWithinALongSong() {
        FakeEventBus bus = new FakeEventBus();
        new SetlistGridCalculator(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerModeChanged(true));
        // One song spanning 65 bars at the default 1 bar/pad => 2 pages.
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "{ long"), new Marker(260, "0,0,0", "}"))));
        assertEquals(2, bus.last(ExplorerGridChanged.class).totalPages());

        bus.send(new RequestExplorerPage(1));
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(1, grid.page());
        assertEquals(256.0, grid.slots().get(0).startBeat());
    }
}
