package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;


class HighlighterTest {

    private static List<Block> bars() {
        List<Block> out = new ArrayList<>();
        for (int i = 0; i < 5; i++) // beats 0,4,8,12,16
            out.add(Block.bar(87, i * 4.0, i * 4.0 + 4.0));
        return out;
    }

    @Test
    void selectionWithNoRangeIsIdentity() {
        for (Block b : new SelectionHighlighter().apply(bars(), 0, 0))
            assertFalse(b.selected);
    }

    @Test
    void selectionFlagsOverlappingBars() {
        List<Block> out = new SelectionHighlighter().apply(bars(), 4, 8); // [4, 12)
        assertFalse(out.get(0).selected); // [0,4)
        assertTrue(out.get(1).selected);  // [4,8)
        assertTrue(out.get(2).selected);  // [8,12)
        assertFalse(out.get(3).selected); // [12,16)
    }

    @Test
    void playbackWithNoPositionIsIdentity() {
        for (Block b : new PlaybackHighlighter().apply(bars(), 0, false))
            assertFalse(b.playing);
    }

    @Test
    void playbackFlagsTheBarUnderTheCursor() {
        List<Block> out = new PlaybackHighlighter().apply(bars(), 5, true); // inside [4,8)
        assertFalse(out.get(0).playing);
        assertTrue(out.get(1).playing);
        assertFalse(out.get(2).playing);
    }
}
