package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PaintPad;

class ExplorerGridPainterTest {

    private static GridSlot empty() {
        return new GridSlot(true, 0, false, false, 0, 0);
    }

    /** A full 64-slot grid that is empty except for the given overrides by index. */
    private static List<GridSlot> grid(java.util.Map<Integer, GridSlot> overrides) {
        List<GridSlot> slots = new ArrayList<>();
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++)
            slots.add(overrides.getOrDefault(i, empty()));
        return slots;
    }

    private static int lastPaintPad(FakeEventBus bus, int note) {
        int color = -1;
        for (Event e : bus.events)
            if (e instanceof PaintPad p && p.n() == note)
                color = p.color();
        return color;
    }

    private static int lastBlinkPad(FakeEventBus bus, int note) {
        int color = -1;
        for (Event e : bus.events)
            if (e instanceof BlinkPad b && b.n() == note)
                color = b.color();
        return color;
    }

    @Test
    void paintsColorEmptyPlayingAndSelectedSlots() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerGridPainter(bus);

        bus.send(new ExplorerGridChanged(grid(java.util.Map.of(
            0, new GridSlot(false, 87, false, false, 0, 4),  // colored
            1, empty(),                                       // off
            2, new GridSlot(false, 87, false, true, 0, 4),    // playing -> blink white
            3, new GridSlot(false, 72, true, false, 0, 4)     // selected -> white
        )), 1, 0));

        assertEquals(87, lastPaintPad(bus, ExplorerConstants.PADS.get(0)));
        assertEquals(0, lastPaintPad(bus, ExplorerConstants.PADS.get(1)));
        assertEquals(ExplorerColors.WHITE, lastBlinkPad(bus, ExplorerConstants.PADS.get(2)));
        assertEquals(ExplorerColors.WHITE, lastPaintPad(bus, ExplorerConstants.PADS.get(3)));
    }

    @Test
    void paintsAllSixtyFourPads() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerGridPainter(bus);

        bus.send(new ExplorerGridChanged(grid(java.util.Map.of()), 1, 0));

        // Every empty slot paints its pad off -> 64 PaintPad events.
        assertEquals(64, bus.count(PaintPad.class));
    }
}
