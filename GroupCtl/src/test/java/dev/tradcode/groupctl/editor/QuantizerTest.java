package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class QuantizerTest {

    // C1 (key 36) is the bottom row.
    private static final int BOTTOM = EditorConstants.GRID_ROWS - 1;

    /** Grid index for row (key) and column. */
    private static int idx(int row, int col) {
        return row * EditorConstants.GRID_COLS + col;
    }

    @Test
    void quantizesOnsetsToColumnsByResolution() {
        // 1/8 => 0.5 beats per column.
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0),
            new EditorNote(36, 0.5),
            new EditorNote(36, 1.0)
        ), 8, true, 0);

        assertTrue(g.get(idx(BOTTOM, 0)).lit());  // [0.0, 0.5)
        assertTrue(g.get(idx(BOTTOM, 1)).lit());  // [0.5, 1.0)
        assertTrue(g.get(idx(BOTTOM, 2)).lit());  // [1.0, 1.5)
        assertFalse(g.get(idx(BOTTOM, 3)).lit());
    }

    @Test
    void foldsMultipleOnsetsInOneCellOntoOnePad() {
        // Two onsets inside the same 1/8 cell [0.0, 0.5).
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0),
            new EditorNote(36, 0.25)
        ), 8, true, 0);

        assertTrue(g.get(idx(BOTTOM, 0)).lit());
        assertFalse(g.get(idx(BOTTOM, 1)).lit());
    }

    @Test
    void mapsKeysToRowsChromaticallyFromBottom() {
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0),  // C1  -> row 7 (bottom)
            new EditorNote(37, 0.0),  // C#1 -> row 6
            new EditorNote(43, 0.0)   // G1  -> row 0 (top)
        ), 8, true, 0);

        assertTrue(g.get(idx(7, 0)).lit());
        assertTrue(g.get(idx(6, 0)).lit());
        assertTrue(g.get(idx(0, 0)).lit());
        assertFalse(g.get(idx(5, 0)).lit());  // D1 (key 38) not present
    }

    @Test
    void resolutionChangesColumnWidth() {
        // 1/4 => 1.0 beat per column: 0.5 falls in column 0.
        assertTrue(new Quantizer().apply(List.of(new EditorNote(36, 0.5)), 4, true, 0)
            .get(idx(BOTTOM, 0)).lit());

        // 1/16 => 0.25 beat per column: 0.5 falls in column 2.
        assertTrue(new Quantizer().apply(List.of(new EditorNote(36, 0.5)), 16, true, 0)
            .get(idx(BOTTOM, 2)).lit());
    }

    @Test
    void ignoresOnsetsBeyondTheVisibleColumns() {
        // 1/8: 8 columns span [0.0, 4.0). An onset at 4.0 is off the right edge.
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 4.0)), 8, true, 0);
        for (int col = 0; col < EditorConstants.GRID_COLS; col++)
            assertFalse(g.get(idx(BOTTOM, col)).lit());
    }

    @Test
    void slotsCarryKeyAndBeatRange() {
        List<EditorSlot> g = new Quantizer().apply(List.of(), 8, true, 0);
        EditorSlot s = g.get(idx(BOTTOM, 1));
        assertEquals(36, s.key());
        assertEquals(0.5, s.startBeat());
        assertEquals(1.0, s.endBeat());
        assertEquals(64, g.size());
    }

    @Test
    void laterPagesWindowOntoLaterBeats() {
        // 1/8: each page spans 8 cols * 0.5 = 4 beats. Page 1 covers [4.0, 8.0).
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 4.5)), 8, true, 1);

        assertFalse(g.get(idx(BOTTOM, 0)).lit());  // [4.0, 4.5)
        assertTrue(g.get(idx(BOTTOM, 1)).lit());   // [4.5, 5.0)
    }

    @Test
    void pageShiftsTheBeatRangeCarriedBySlots() {
        // Page 1 at 1/8 starts at beat 4.0; column 0 spans [4.0, 4.5).
        EditorSlot s = new Quantizer().apply(List.of(), 8, true, 1).get(idx(BOTTOM, 0));
        assertEquals(4.0, s.startBeat());
        assertEquals(4.5, s.endBeat());
    }

    @Test
    void firstPageOnsetsAreHiddenOnLaterPages() {
        // A beat-0 onset belongs to page 0 and must not bleed onto page 1.
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 0.0)), 8, true, 1);
        for (int col = 0; col < EditorConstants.GRID_COLS; col++)
            assertFalse(g.get(idx(BOTTOM, col)).lit());
    }

    @Test
    void singleOnsetCellCarriesItsVelocity() {
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0, 0.42)
        ), 8, true, 0);
        assertEquals(0.42, g.get(idx(BOTTOM, 0)).velocity(), 1e-9);
    }

    @Test
    void multiOnsetCellDefaultsVelocityToFull() {
        // Two onsets fold into one cell; the encoder arrives at a known baseline.
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0, 0.2),
            new EditorNote(36, 0.25, 0.3)
        ), 8, true, 0);
        assertEquals(1.0, g.get(idx(BOTTOM, 0)).velocity(), 1e-9);
    }

    @Test
    void nothingIsLitWhenNoClipExists() {
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 0.0)), 8, false, 0);
        for (EditorSlot s : g)
            assertFalse(s.lit());
    }
}
