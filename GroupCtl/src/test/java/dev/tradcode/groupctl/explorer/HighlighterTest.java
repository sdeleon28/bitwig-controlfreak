package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PlaybackPositionChanged;
import dev.tradcode.groupctl.events.SelectionChanged;

class HighlighterTest {

    private static List<Block> bars() {
        List<Block> out = new ArrayList<>();
        for (int i = 0; i < 5; i++) // beats 0,4,8,12,16
            out.add(Block.bar(87, i * 4.0, i * 4.0 + 4.0));
        return out;
    }

    @Test
    void selectionWithNoRangeIsIdentity() {
        SelectionHighlighter sh = new SelectionHighlighter(new FakeEventBus());
        for (Block b : sh.apply(bars()))
            assertFalse(b.selected);
    }

    @Test
    void selectionFlagsOverlappingBars() {
        FakeEventBus bus = new FakeEventBus();
        SelectionHighlighter sh = new SelectionHighlighter(bus);
        bus.send(new SelectionChanged(4, 8)); // [4, 12)

        List<Block> out = sh.apply(bars());
        assertFalse(out.get(0).selected); // [0,4)
        assertTrue(out.get(1).selected);  // [4,8)
        assertTrue(out.get(2).selected);  // [8,12)
        assertFalse(out.get(3).selected); // [12,16)
    }

    @Test
    void playbackWithNoPositionIsIdentity() {
        PlaybackHighlighter ph = new PlaybackHighlighter(new FakeEventBus());
        for (Block b : ph.apply(bars()))
            assertFalse(b.playing);
    }

    @Test
    void playbackFlagsTheBarUnderTheCursor() {
        FakeEventBus bus = new FakeEventBus();
        PlaybackHighlighter ph = new PlaybackHighlighter(bus);
        bus.send(new PlaybackPositionChanged(5)); // inside [4,8)

        List<Block> out = ph.apply(bars());
        assertFalse(out.get(0).playing);
        assertTrue(out.get(1).playing);
        assertFalse(out.get(2).playing);
    }
}
