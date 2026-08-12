package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class ExplorerModeCoordinatorTest {

    static final String C = "0,0,0";
    static Marker m(double pos, String name) { return new Marker(pos, C, name); }

    @Test
    void staysSilentAndNormalWhenNoCompleteSongExists() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerModeCoordinator(bus);
        bus.send(new MarkersChanged(List.of(m(0, "intro"), m(4, "{ unclosed"))));
        assertNull(bus.last(ExplorerModeChanged.class));
    }

    @Test
    void announcesSetlistWhenACompleteSongAppears() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerModeCoordinator(bus);
        bus.send(new MarkersChanged(List.of(m(0, "{ song"), m(8, "}"))));
        assertTrue(bus.last(ExplorerModeChanged.class).setlist());
        assertEquals(1, bus.count(ExplorerModeChanged.class));
    }

    @Test
    void onlyEmitsWhenTheModeFlips() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerModeCoordinator(bus);
        bus.send(new MarkersChanged(List.of(m(0, "{ a"), m(8, "}"))));       // -> setlist
        bus.send(new MarkersChanged(List.of(m(0, "{ a"), m(8, "}"), m(12, "{ b"), m(20, "}"))));
        assertEquals(1, bus.count(ExplorerModeChanged.class)); // still setlist, no re-emit

        bus.send(new MarkersChanged(List.of(m(0, "just markers")))); // -> normal
        assertEquals(2, bus.count(ExplorerModeChanged.class));
        assertEquals(false, bus.last(ExplorerModeChanged.class).setlist());
    }
}
