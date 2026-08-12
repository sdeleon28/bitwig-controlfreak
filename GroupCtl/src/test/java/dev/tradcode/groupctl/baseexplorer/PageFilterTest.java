package dev.tradcode.groupctl.explorer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;


class PageFilterTest {

    private static List<Block> bars(int count) {
        List<Block> out = new ArrayList<>();
        for (int i = 0; i < count; i++)
            out.add(Block.bar(87, i * 4.0, i * 4.0 + 4.0));
        return out;
    }

    @Test
    void alwaysReturns64Slots() {
        PageFilter pf = new PageFilter();
        assertEquals(64, pf.apply(List.of(), 0).size());
        assertEquals(64, pf.apply(bars(3), 0).size());
        assertEquals(64, pf.apply(bars(200), 0).size());
    }

    @Test
    void padsShortPageWithEmptySlots() {
        List<Block> grid = new PageFilter().apply(bars(3), 0);
        assertFalse(grid.get(0).empty);
        assertFalse(grid.get(2).empty);
        assertTrue(grid.get(3).empty);
        assertTrue(grid.get(63).empty);
    }

    @Test
    void slicesToTheSelectedPage() {
        List<Block> grid = new PageFilter().apply(bars(70), 1); // 70 blocks -> page 1 has 6 real
        assertFalse(grid.get(0).empty);
        assertEquals(64 * 4.0, grid.get(0).startBeat); // first block of page 1
        assertFalse(grid.get(5).empty);
        assertTrue(grid.get(6).empty);
    }
}
