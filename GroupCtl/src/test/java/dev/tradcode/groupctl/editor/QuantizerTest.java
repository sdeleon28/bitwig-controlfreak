package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class QuantizerTest {

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
        ), 8, true);

        assertTrue(g.get(idx(0, 0)).lit());  // [0.0, 0.5)
        assertTrue(g.get(idx(0, 1)).lit());  // [0.5, 1.0)
        assertTrue(g.get(idx(0, 2)).lit());  // [1.0, 1.5)
        assertFalse(g.get(idx(0, 3)).lit());
    }

    @Test
    void foldsMultipleOnsetsInOneCellOntoOnePad() {
        // Two onsets inside the same 1/8 cell [0.0, 0.5).
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0),
            new EditorNote(36, 0.25)
        ), 8, true);

        assertTrue(g.get(idx(0, 0)).lit());
        assertFalse(g.get(idx(0, 1)).lit());
    }

    @Test
    void mapsKeysToRowsChromaticallyFromTop() {
        List<EditorSlot> g = new Quantizer().apply(List.of(
            new EditorNote(36, 0.0),  // C1  -> row 0 (top)
            new EditorNote(37, 0.0),  // C#1 -> row 1
            new EditorNote(43, 0.0)   // G1  -> row 7 (bottom)
        ), 8, true);

        assertTrue(g.get(idx(0, 0)).lit());
        assertTrue(g.get(idx(1, 0)).lit());
        assertTrue(g.get(idx(7, 0)).lit());
        assertFalse(g.get(idx(2, 0)).lit());
    }

    @Test
    void resolutionChangesColumnWidth() {
        // 1/4 => 1.0 beat per column: 0.5 falls in column 0.
        assertTrue(new Quantizer().apply(List.of(new EditorNote(36, 0.5)), 4, true)
            .get(idx(0, 0)).lit());

        // 1/16 => 0.25 beat per column: 0.5 falls in column 2.
        assertTrue(new Quantizer().apply(List.of(new EditorNote(36, 0.5)), 16, true)
            .get(idx(0, 2)).lit());
    }

    @Test
    void ignoresOnsetsBeyondTheVisibleColumns() {
        // 1/8: 8 columns span [0.0, 4.0). An onset at 4.0 is off the right edge.
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 4.0)), 8, true);
        for (int col = 0; col < EditorConstants.GRID_COLS; col++)
            assertFalse(g.get(idx(0, col)).lit());
    }

    @Test
    void slotsCarryKeyAndBeatRange() {
        List<EditorSlot> g = new Quantizer().apply(List.of(), 8, true);
        EditorSlot s = g.get(idx(0, 1));
        assertEquals(36, s.key());
        assertEquals(0.5, s.startBeat());
        assertEquals(1.0, s.endBeat());
        assertEquals(64, g.size());
    }

    @Test
    void nothingIsLitWhenNoClipExists() {
        List<EditorSlot> g = new Quantizer().apply(List.of(new EditorNote(36, 0.0)), 8, false);
        for (EditorSlot s : g)
            assertFalse(s.lit());
    }
}
