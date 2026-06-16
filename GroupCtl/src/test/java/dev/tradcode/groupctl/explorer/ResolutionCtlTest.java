package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.ResolutionChanged;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class ResolutionCtlTest {

    /** Two markers spanning lastBeat beats => ~lastBeat/4 + 1 content bars. */
    private static MarkersChanged span(double lastBeat) {
        return new MarkersChanged(List.of(
            new Marker(0, "0,156,68", "A"),
            new Marker(lastBeat, "216,46,34", "B")
        ));
    }

    @Test
    void ignoresButtonsUntilExplorerPageActive() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new TopButtonClick(TopButton.SESSION));
        assertNull(bus.last(ResolutionChanged.class));
    }

    @Test
    void sessionZoomsOutUpToMax() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new PageSelected(1));

        int[] expected = {2, 4, 8, 16, 32};
        for (int e : expected) {
            bus.send(new TopButtonClick(TopButton.SESSION));
            assertEquals(e, bus.last(ResolutionChanged.class).barsPerPad());
        }
        // Already at max: no further change emitted.
        long before = bus.count(ResolutionChanged.class);
        bus.send(new TopButtonClick(TopButton.SESSION));
        assertEquals(before, bus.count(ResolutionChanged.class));
    }

    @Test
    void user1ZoomsInDownToMin() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new PageSelected(1));

        // At min already (1) -> no change.
        bus.send(new TopButtonClick(TopButton.USER_1));
        assertNull(bus.last(ResolutionChanged.class));

        bus.send(new TopButtonClick(TopButton.SESSION)); // -> 2
        bus.send(new TopButtonClick(TopButton.USER_1));  // -> 1
        assertEquals(1, bus.last(ResolutionChanged.class).barsPerPad());
    }

    @Test
    void autoFitsToOnePageOnEntry() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);

        bus.send(span(256)); // 65 bars; arrives while off the explorer page
        assertNull(bus.last(ResolutionChanged.class)); // no auto-fit until active

        bus.send(new PageSelected(1));
        assertEquals(2, bus.last(ResolutionChanged.class).barsPerPad());
    }

    @Test
    void autoFitsWhenMarkersChangeWhileOnPage() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(span(256));
        assertEquals(2, bus.last(ResolutionChanged.class).barsPerPad());
    }

    @Test
    void fallsBackToCoarsestResolutionForHugeProjects() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(span(8400)); // > 2048 bars => doesn't fit even at 32
        assertEquals(32, bus.last(ResolutionChanged.class).barsPerPad());
    }

    @Test
    void manualZoomOverridesAutoFitUntilReentry() {
        FakeEventBus bus = new FakeEventBus();
        new ResolutionCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(span(256)); // auto-fit -> 2

        bus.send(new TopButtonClick(TopButton.SESSION)); // manual -> 4
        assertEquals(4, bus.last(ResolutionChanged.class).barsPerPad());

        // Markers change again: manual choice is respected (no auto-fit).
        long before = bus.count(ResolutionChanged.class);
        bus.send(span(256));
        assertEquals(before, bus.count(ResolutionChanged.class));

        // Leaving and re-entering re-fits.
        bus.send(new PageSelected(0));
        bus.send(new PageSelected(1));
        assertEquals(2, bus.last(ResolutionChanged.class).barsPerPad());
    }
}
