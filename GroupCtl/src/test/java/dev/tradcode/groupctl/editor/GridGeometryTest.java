package dev.tradcode.groupctl.editor;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GridGeometryTest {

    @Test
    void columnWidthFollowsTheResolution() {
        assertEquals(1.0, GridGeometry.beatsPerStep(4));    // 1/4 -> 1 beat
        assertEquals(0.5, GridGeometry.beatsPerStep(8));    // 1/8 -> half a beat
        assertEquals(0.25, GridGeometry.beatsPerStep(16));
    }

    @Test
    void rowsAscendChromaticallyFromC1AtTheBottom() {
        assertEquals(36, GridGeometry.keyForRow(7));        // bottom row -> C1
        assertEquals(37, GridGeometry.keyForRow(6));
        assertEquals(43, GridGeometry.keyForRow(0));        // top row
    }

    @Test
    void aClipThatFillsTheReadWindowSplitsByResolution() {
        double full = EditorConstants.READ_BEATS;
        assertEquals(1, GridGeometry.totalPages(4, full));
        assertEquals(2, GridGeometry.totalPages(8, full));
        assertEquals(4, GridGeometry.totalPages(16, full));
        assertEquals(8, GridGeometry.totalPages(32, full));
    }

    @Test
    void pageCountIsBoundedByTheClipLength() {
        assertEquals(1, GridGeometry.totalPages(8, 2.0));   // 2 beats fit one 4-beat page
        assertEquals(1, GridGeometry.totalPages(16, 2.0));  // window alone would give 4
        assertEquals(2, GridGeometry.totalPages(32, 2.0));  // 1-beat pages -> 2 pages
    }

    @Test
    void aShortClipStillHasASinglePage() {
        assertEquals(1, GridGeometry.totalPages(8, 0.0));
    }

    @Test
    void aClipLongerThanTheReadWindowIsCappedToWhatCanBeShown() {
        assertEquals(2, GridGeometry.totalPages(8, 100.0));  // capped at the read window
    }
}
