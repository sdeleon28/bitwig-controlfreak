package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.BaseExplorer;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.normalexplorer.NormalExplorer;
import dev.tradcode.groupctl.setlistexplorer.events.ShowSetlist;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

/** End-to-end over the full stack, exercising the setlist engaging on {@code { }} markers. */
class SetlistExplorerTest {

    static final String GREEN = "0,156,68"; // -> launchpad 87
    static final String RED = "216,46,34";

    private static void wire(FakeEventBus bus) {
        new BaseExplorer(bus, null);
        new NormalExplorer(bus);
        new SetlistExplorer(bus, null);
    }

    private static MarkersChanged setlist() {
        return new MarkersChanged(List.of(
            new Marker(0, GREEN, "{ a"), new Marker(16, "0,0,0", "}"),
            new Marker(20, RED, "{ b"), new Marker(36, "0,0,0", "}")));
    }

    private static int lastPaintPad(FakeEventBus bus, int note) {
        int color = -1;
        for (Event e : bus.events)
            if (e instanceof PaintPad p && p.n() == note)
                color = p.color();
        return color;
    }

    private static int lastSideColor(FakeEventBus bus, SideButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintSideButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    @Test
    void setlistTakesOverWhenBraceMarkersArePresent() {
        FakeEventBus bus = new FakeEventBus();
        wire(bus);
        bus.send(new PageSelected(1));
        bus.send(setlist());

        // The grid shows the first song only: green top-left, one page.
        assertEquals(87, lastPaintPad(bus, 81));
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(0.0, grid.slots().get(0).startBeat());
        assertFalse(grid.slots().get(3).empty());
        assertTrue(grid.slots().get(4).empty());
        // The "show setlist" affordance lights up.
        assertEquals(SetlistColors.SETLIST, lastSideColor(bus, SideButton.SEND_A));
    }

    @Test
    void handsOverFromNormalToSetlistWhenBracesAppear() {
        FakeEventBus bus = new FakeEventBus();
        wire(bus);
        bus.send(new PageSelected(1));
        // Plain markers first: the normal view drives, spanning the whole project.
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"), new Marker(40, RED, "B"))));
        assertEquals(87, lastPaintPad(bus, 81)); // normal view painting bar 0 green

        // Braces appear: the setlist reducer takes over the same page.
        bus.send(setlist());
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(0.0, grid.slots().get(0).startBeat());
        assertTrue(grid.slots().get(4).empty()); // song A only, not the whole project
    }

    @Test
    void sendAGrowlsTheWholeSetlist() {
        FakeEventBus bus = new FakeEventBus();
        wire(bus);
        bus.send(new PageSelected(1));
        bus.send(setlist());

        bus.send(new SideButtonClick(SideButton.SEND_A));
        assertEquals("a  ·  b", bus.last(ShowSetlist.class).text());
    }
}
