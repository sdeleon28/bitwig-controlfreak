package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.ResolutionChanged;

class ResolutionCalculatorTest {

    private static List<Block> bars(int count, int color) {
        List<Block> out = new ArrayList<>();
        for (int i = 0; i < count; i++)
            out.add(Block.bar(color, i * 4.0, i * 4.0 + 4.0));
        return out;
    }

    @Test
    void defaultResolutionIsIdentity() {
        FakeEventBus bus = new FakeEventBus();
        ResolutionCalculator rc = new ResolutionCalculator(bus);
        assertEquals(5, rc.apply(bars(5, 87)).size());
    }

    @Test
    void mergesBarsPerPad() {
        FakeEventBus bus = new FakeEventBus();
        ResolutionCalculator rc = new ResolutionCalculator(bus);
        bus.send(new ResolutionChanged(2));
        List<Block> out = rc.apply(bars(5, 87));
        assertEquals(3, out.size()); // 2 + 2 + 1
        assertEquals(0.0, out.get(0).startBeat);
        assertEquals(8.0, out.get(0).endBeat);
        assertEquals(16.0, out.get(2).startBeat);
        assertEquals(20.0, out.get(2).endBeat);
    }

    @Test
    void breaksGroupsOnColorChangeForFreshSectionStarts() {
        FakeEventBus bus = new FakeEventBus();
        ResolutionCalculator rc = new ResolutionCalculator(bus);
        bus.send(new ResolutionChanged(4));

        // A A A B A A A A  -> [A(3 bars), B(1 bar), A(4 bars)]
        List<Block> in = new ArrayList<>();
        int[] colors = {87, 87, 87, 72, 87, 87, 87, 87};
        for (int i = 0; i < colors.length; i++)
            in.add(Block.bar(colors[i], i * 4.0, i * 4.0 + 4.0));

        List<Block> out = rc.apply(in);
        assertEquals(3, out.size());
        assertEquals(87, out.get(0).color);
        assertEquals(12.0, out.get(0).endBeat); // 3 bars
        assertEquals(72, out.get(1).color);
        assertEquals(16.0, out.get(1).endBeat); // 1 bar
        assertEquals(87, out.get(2).color);
        assertEquals(32.0, out.get(2).endBeat); // 4 bars
    }

    @Test
    void mergedBlockOrsSelectedAndPlayingFlags() {
        FakeEventBus bus = new FakeEventBus();
        ResolutionCalculator rc = new ResolutionCalculator(bus);
        bus.send(new ResolutionChanged(2));

        List<Block> in = List.of(
            Block.bar(87, 0, 4).withSelected(true),
            Block.bar(87, 4, 8).withPlaying(true)
        );
        List<Block> out = rc.apply(in);
        assertEquals(1, out.size());
        assertTrue(out.get(0).selected);
        assertTrue(out.get(0).playing);
        assertFalse(out.get(0).empty);
    }
}
