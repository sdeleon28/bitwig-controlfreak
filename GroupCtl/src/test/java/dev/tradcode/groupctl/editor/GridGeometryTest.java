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
    void aKeyOffsetLiftsTheWholeWindowUpByThatManySemitones() {
        // The top vertical page sits an octave above C1.
        assertEquals(44, GridGeometry.keyForRow(7, EditorConstants.MAX_KEY_OFFSET));  // bottom row
        assertEquals(51, GridGeometry.keyForRow(0, EditorConstants.MAX_KEY_OFFSET));  // top row
        // A mid-scroll offset windows onto an overlapping band.
        assertEquals(39, GridGeometry.keyForRow(7, 3));
    }

    @Test
    void aClipThatFillsTheReadWindowSplitsByResolution() {
        double full = EditorConstants.READ_BEATS; // 64 beats / 16 bars
        assertEquals(8, GridGeometry.totalPages(4, full));
        assertEquals(16, GridGeometry.totalPages(8, full));
        assertEquals(32, GridGeometry.totalPages(16, full));
        assertEquals(64, GridGeometry.totalPages(32, full));
    }

    @Test
    void pageCountFollowsTheClipLength() {
        assertEquals(1, GridGeometry.totalPages(8, 2.0));   // 2 beats fit one 4-beat page
        assertEquals(1, GridGeometry.totalPages(16, 2.0));  // 2 beats fit one 2-beat page
        assertEquals(2, GridGeometry.totalPages(32, 2.0));  // 1-beat pages -> 2 pages
    }

    @Test
    void longClipsPageBeyondTheOldEightBeatWindow() {
        // The regression: a 16-beat clip at 1/8 used to cap at 2 pages.
        assertEquals(4, GridGeometry.totalPages(8, 16.0));
        // A 4-bar clip at 1/16 spans 8 two-beat pages.
        assertEquals(8, GridGeometry.totalPages(16, 16.0));
    }

    @Test
    void aShortClipStillHasASinglePage() {
        assertEquals(1, GridGeometry.totalPages(8, 0.0));
    }

    @Test
    void aClipLongerThanTheReadWindowIsCappedToWhatCanBeShown() {
        assertEquals(16, GridGeometry.totalPages(8, 100.0));  // capped at the 64-beat read window
    }
}
