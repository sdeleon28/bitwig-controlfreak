package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.Block;
import dev.tradcode.groupctl.baseexplorer.Song;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

class SongBarsCalculatorTest {

    static final String GREEN = "0,156,68"; // -> launchpad 87
    static final String RED = "216,46,34";  // -> launchpad 72

    private final SongBarsCalculator calc = new SongBarsCalculator();

    @Test
    void laysSectionColorsAcrossTheSongAndStopsAtTheCloser() {
        Song song = new Song("s", 0, 16, List.of(
            new Marker(0, GREEN, "{ s"),
            new Marker(8, RED, "verse"),
            new Marker(16, "0,0,0", "}")));

        List<Block> blocks = calc.apply(song);

        // 0..16 at one bar each -> 4 blocks; opener green for the first two,
        // the section red for the last two. The closer paints nothing.
        assertEquals(4, blocks.size());
        assertEquals(87, blocks.get(0).color);
        assertEquals(87, blocks.get(1).color);
        assertEquals(72, blocks.get(2).color);
        assertEquals(72, blocks.get(3).color);
        assertEquals(0.0, blocks.get(0).startBeat);
        assertEquals(16.0, blocks.get(3).endBeat);
    }

    @Test
    void clampsTheLastBarToTheCloserBeat() {
        Song song = new Song("s", 0, 6, List.of(
            new Marker(0, GREEN, "{ s"),
            new Marker(6, "0,0,0", "}")));

        List<Block> blocks = calc.apply(song);

        assertEquals(2, blocks.size());        // bars at [0,4) and [4,6)
        assertEquals(6.0, blocks.get(1).endBeat);
    }

    @Test
    void spansFromTheOpenerNotBeatZero() {
        Song song = new Song("s", 100, 108, List.of(
            new Marker(100, GREEN, "{ s"),
            new Marker(108, "0,0,0", "}")));

        List<Block> blocks = calc.apply(song);

        assertEquals(2, blocks.size());
        assertEquals(100.0, blocks.get(0).startBeat);
    }
}
