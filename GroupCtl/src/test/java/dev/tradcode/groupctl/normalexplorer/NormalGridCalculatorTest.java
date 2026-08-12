package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import dev.tradcode.groupctl.explorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class GridCalculatorTest {

    static final String GREEN = "0,156,68"; // -> launchpad 87
    static final String RED = "216,46,34";  // -> launchpad 72

    @Test
    void reducesMarkersToA64SlotGridWhenActive() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));

        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(64, grid.slots().size());
        assertEquals(1, grid.totalPages());
        assertFalse(grid.slots().get(0).empty());
        assertEquals(87, grid.slots().get(0).color());
        assertEquals(0.0, grid.slots().get(0).startBeat());
        assertTrue(grid.slots().get(1).empty());
    }

    @Test
    void staysSilentUntilTheExplorerPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));
        assertNull(bus.last(ExplorerGridChanged.class));
    }

    @Test
    void foldsSelectionAndPlaybackIntoTheSlots() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(4, RED, "B")
        )));
        bus.send(new BitwigSelectionChanged(4, 4)); // [4, 8) -> bar 1
        bus.send(new PlaybackUpdate(1, true));    // inside [0, 4) -> bar 0

        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertTrue(grid.slots().get(0).playing());
        assertTrue(grid.slots().get(1).selected());
    }

    @Test
    void highlightsThePendingSelectionAnchorAndClearsIt() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(4, RED, "B")
        )));

        // Anchor over bar 1 ([4,8)) lights that slot without touching bar 0.
        bus.send(new PendingSelectionChanged(4, 4));
        assertTrue(bus.last(ExplorerGridChanged.class).slots().get(1).selected());
        assertFalse(bus.last(ExplorerGridChanged.class).slots().get(0).selected());

        // Clearing the anchor (duration 0) drops the highlight.
        bus.send(new PendingSelectionChanged(0, 0));
        assertFalse(bus.last(ExplorerGridChanged.class).slots().get(1).selected());
    }

    @Test
    void suppressesTheCommittedSelectionWhileSelectingButKeepsThePendingAnchor() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(4, RED, "B")
        )));
        bus.send(new BitwigSelectionChanged(0, 4)); // committed loop over bar 0
        assertTrue(bus.last(ExplorerGridChanged.class).slots().get(0).selected());

        // Entering select mode hides the committed loop highlight.
        bus.send(new SelectionModeChanged(true));
        assertFalse(bus.last(ExplorerGridChanged.class).slots().get(0).selected());

        // The live pending anchor still lights up while selecting.
        bus.send(new PendingSelectionChanged(4, 4)); // bar 1
        assertFalse(bus.last(ExplorerGridChanged.class).slots().get(0).selected());
        assertTrue(bus.last(ExplorerGridChanged.class).slots().get(1).selected());

        // Leaving select mode restores the committed loop highlight.
        bus.send(new SelectionModeChanged(false));
        assertTrue(bus.last(ExplorerGridChanged.class).slots().get(0).selected());
    }

    @Test
    void dropsStaleSelectModeWhenTheExplorerPageGoesAway() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));
        bus.send(new BitwigSelectionChanged(0, 4));
        bus.send(new SelectionModeChanged(true)); // selecting, loop hidden

        // Leaving the page cancels select mode (SelectionCtl resets it locally
        // without a SelectionModeChanged event), so re-entry shows the loop again.
        bus.send(new PageSelected(0));
        bus.send(new PageSelected(1));
        assertTrue(bus.last(ExplorerGridChanged.class).slots().get(0).selected());
    }

    @Test
    void reslicesWhenSteppedToTheNextPage() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        // 0..256 bars => 65 one-bar blocks at the default 1 bar/pad => 2 pages.
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(256, RED, "B")
        )));
        assertEquals(2, bus.last(ExplorerGridChanged.class).totalPages());
        assertEquals(0, bus.last(ExplorerGridChanged.class).page());

        bus.send(new RequestExplorerPage(1));
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(1, grid.page());
        // Page 1 starts at block 64 -> the last (65th) bar at beat 256.
        assertFalse(grid.slots().get(0).empty());
        assertEquals(256.0, grid.slots().get(0).startBeat());
        assertTrue(grid.slots().get(1).empty());
    }

    @Test
    void clampsThePageWhenContentShrinksBelowIt() {
        FakeEventBus bus = new FakeEventBus();
        new GridCalculator(bus);

        bus.send(new PageSelected(1));
        bus.send(new MarkersChanged(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(256, RED, "B")
        )));
        bus.send(new RequestExplorerPage(1)); // now on page 1 of 2
        assertEquals(1, bus.last(ExplorerGridChanged.class).page());

        // Content shrinks to a single page: the page is pulled back to 0 and the
        // grid broadcast is already correct (no out-of-range frame to fix up).
        bus.send(new MarkersChanged(List.of(new Marker(0, GREEN, "A"))));
        ExplorerGridChanged grid = bus.last(ExplorerGridChanged.class);
        assertEquals(1, grid.totalPages());
        assertEquals(0, grid.page());
        assertFalse(grid.slots().get(0).empty());
    }
}
