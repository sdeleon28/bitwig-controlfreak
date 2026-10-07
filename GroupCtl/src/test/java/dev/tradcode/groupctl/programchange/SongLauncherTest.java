package dev.tradcode.groupctl.programchange;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.baseexplorer.events.RequestStopPlayback;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.programchange.events.ProgramChangeReceived;
import dev.tradcode.groupctl.programchange.events.RequestPlayFrom;

class SongLauncherTest {
    static Marker m(double pos, String name) { return new Marker(pos, "", name); }

    static final MarkersChanged SETLIST = new MarkersChanged(List.of(
        m(0, "intro"),
        m(16, "{ First"),
        m(32, "chorus"),
        m(48, "}"),
        m(64, "{ Second"),
        m(96, "}"),
        m(128, "{ Unclosed")));

    static FakeEventBus launch(Event... events) {
        var bus = new FakeEventBus();
        new SongLauncher(bus);
        bus.send(events);
        return bus;
    }

    static List<Double> playedFrom(FakeEventBus bus) {
        return bus.events.stream()
            .filter(RequestPlayFrom.class::isInstance)
            .map(e -> ((RequestPlayFrom) e).beat())
            .toList();
    }

    @Test
    void programChangeNPlaysTheNthSongFromItsOpener() {
        var bus = launch(SETLIST, new ProgramChangeReceived(1), new ProgramChangeReceived(2));
        assertEquals(List.of(16.0, 64.0), playedFrom(bus));
    }

    @Test
    void programChangeZeroStopsPlayback() {
        var bus = launch(SETLIST, new ProgramChangeReceived(0));
        assertEquals(1, bus.count(RequestStopPlayback.class));
        assertEquals(List.of(), playedFrom(bus));
    }

    @Test
    void programChangeBeyondTheSetlistIsIgnored() {
        var bus = launch(SETLIST, new ProgramChangeReceived(3));
        assertEquals(List.of(), playedFrom(bus));
        assertEquals(0, bus.count(RequestStopPlayback.class));
    }

    @Test
    void programChangeBeforeAnyMarkersIsIgnored() {
        var bus = launch(new ProgramChangeReceived(1));
        assertEquals(List.of(), playedFrom(bus));
    }

    @Test
    void songsFollowMarkerChanges() {
        var bus = launch(SETLIST,
            new MarkersChanged(List.of(m(200, "{ Moved"), m(240, "}"))),
            new ProgramChangeReceived(1));
        assertEquals(List.of(200.0), playedFrom(bus));
    }
}
