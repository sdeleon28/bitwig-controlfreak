package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Marker;

class BarsCalculatorTest {

    static final String GREEN = "0,156,68"; // -> launchpad 87
    static final String RED = "216,46,34";  // -> launchpad 72

    @Test
    void noMarkersProducesNoBlocks() {
        assertTrue(new BarsCalculator().apply(List.of()).isEmpty());
    }

    @Test
    void singleMarkerProducesOneTrailingBar() {
        List<Block> blocks = new BarsCalculator().apply(List.of(new Marker(0, GREEN, "A")));
        assertEquals(1, blocks.size());
        assertEquals(87, blocks.get(0).color);
        assertEquals(0.0, blocks.get(0).startBeat);
        assertEquals(4.0, blocks.get(0).endBeat);
    }

    @Test
    void coloringFollowsTheActiveMarkerPerBar() {
        // Marker A at beat 0, marker B at beat 16 (4 bars later).
        List<Block> blocks = new BarsCalculator().apply(List.of(
            new Marker(0, GREEN, "A"),
            new Marker(16, RED, "B")
        ));
        // 4 bars of A (beats 0,4,8,12) + 1 trailing bar of B (beat 16).
        assertEquals(5, blocks.size());
        assertEquals(87, blocks.get(0).color);
        assertEquals(87, blocks.get(3).color);
        assertEquals(72, blocks.get(4).color);
        assertEquals(16.0, blocks.get(4).startBeat);
    }

    @Test
    void normalizesUnsortedInput() {
        List<Block> blocks = new BarsCalculator().apply(List.of(
            new Marker(16, RED, "B"),
            new Marker(0, GREEN, "A")
        ));
        assertEquals(87, blocks.get(0).color);
        assertEquals(72, blocks.get(blocks.size() - 1).color);
    }
}
