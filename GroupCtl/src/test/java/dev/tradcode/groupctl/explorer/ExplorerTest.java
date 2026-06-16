package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.ExplorerGridChanged;
import dev.tradcode.groupctl.events.ExplorerPagesChanged;
import dev.tradcode.groupctl.events.Marker;
import dev.tradcode.groupctl.events.MarkersChanged;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.events.ResolutionChanged;

class ExplorerTest {

    static final String GREEN = "0,156,68"; // -> launchpad 87
    static final String RED = "216,46,34";  // -> launchpad 72

    /** Color last painted to a launchpad note via PaintPad, or -1 if never. */
    private static int lastPaintPad(FakeEventBus bus, int note) {
        int color = -1;
        for (Event e : bus.events)
            if (e instanceof PaintPad p && p.n() == note)
                color = p.color();
        return color;
    }

    @Test
    void paintsTheActiveSectionWhenMarkersArriveOnTheExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));

        // Top-left pad shows the section color; the rest of the grid is off.
        assertEquals(87, lastPaintPad(bus, 81));
        assertEquals(0, lastPaintPad(bus, 82));
        assertEquals(0, lastPaintPad(bus, 18));
    }

    @Test
    void broadcastsAGridForTheHandlers() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));

        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(64, grid.slots().size());
        assertFalse(grid.slots().get(0).empty());
        assertEquals(0.0, grid.slots().get(0).startBeat());
        assertTrue(grid.slots().get(1).empty());
    }

    @Test
    void padPressSeeksOnTheExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));

        bus.send(new PadClicked(81));
        assertEquals(0.0, bus.last(RequestSetPlaybackPosition.class).beat());
    }

    @Test
    void autoFitsResolutionSoTheProjectLandsOnOnePage() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new PageSelected(1));
        // 0..256 in bars => 65 one-bar blocks; doesn't fit at 1 bar/pad, so
        // auto-fit zooms to 2 bars/pad and it lands on a single page.
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(256, RED, "B")
        )));
        assertEquals(2, bus.last(ResolutionChanged.class).barsPerPad());
        assertEquals(1, bus.last(ExplorerPagesChanged.class).totalPages());
    }

    @Test
    void reportsMultiplePagesWhenContentExceedsEvenTheCoarsestResolution() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new PageSelected(1));
        // 0..8400 in bars => ~2101 bars; even at 32 bars/pad that's > 64 pads.
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(8400, RED, "B")
        )));
        assertEquals(32, bus.last(ResolutionChanged.class).barsPerPad());
        assertEquals(2, bus.last(ExplorerPagesChanged.class).totalPages());
    }

    @Test
    void stopsPaintingTheGridWhenInactive() {
        // Clearing the grid on a page switch is the Pager's job (see PagerTest);
        // the explorer simply goes quiet and never paints while inactive.
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));
        bus.send(new PageSelected(0));

        long paintsWhileInactive = bus.count(PaintPad.class);
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(16, RED, "B")
        )));
        assertEquals(paintsWhileInactive, bus.count(PaintPad.class));
    }

    @Test
    void staysDormantUntilTheExplorerPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new Explorer(bus, null);
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));
        // Never navigated to the explorer: nothing painted.
        assertEquals(-1, lastPaintPad(bus, 81));
    }
}
