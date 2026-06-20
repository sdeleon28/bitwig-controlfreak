package dev.tradcode.groupctl.editor;

/**
 * Derives the editor grid's musical layout from {@link EditorConstants}: how
 * beats map onto columns, rows onto keys, and a clip onto horizontal pages.
 */
public final class GridGeometry {
    private GridGeometry() { }

    /** Beat span of one column at the given note denominator (1/4 = 1 beat). */
    public static double beatsPerStep(int denominator) {
        return 4.0 / denominator;
    }

    /** MIDI key for a grid row; the bottom row is C1, ascending upward. */
    public static int keyForRow(int row) {
        return keyForRow(row, 0);
    }

    /**
     * MIDI key for a grid row once the visible window is lifted by {@code keyOffset}
     * semitones, the lever the vertical pages pull to show a higher octave.
     */
    public static int keyForRow(int row, int keyOffset) {
        return EditorConstants.BASE_KEY + keyOffset + (EditorConstants.GRID_ROWS - 1 - row);
    }

    /**
     * Pages needed to cover a clip of the given length, never more than the read
     * window can display. A clip shorter than one page still has a single page.
     */
    public static int totalPages(int denominator, double lengthBeats) {
        int pagesForClip = Math.max(1,
            (int) Math.ceil(lengthBeats / beatsPerPage(denominator) - 1e-9));
        return Math.min(pagesForClip, readWindowPages(denominator));
    }

    /** Beat span of one full grid page at the given resolution. */
    private static double beatsPerPage(int denominator) {
        return EditorConstants.GRID_COLS * beatsPerStep(denominator);
    }

    /**
     * How many horizontal pages the fixed read window splits into at the given
     * resolution. The window holds {@link EditorConstants#READ_STEPS} fine steps;
     * a page covers {@link EditorConstants#GRID_COLS} columns, each spanning
     * several fine steps.
     */
    private static int readWindowPages(int denominator) {
        int fineStepsPerColumn = (int) Math.round(beatsPerStep(denominator) / EditorConstants.FINE_STEP_BEATS);
        int fineStepsPerPage = EditorConstants.GRID_COLS * fineStepsPerColumn;
        return Math.max(1, (EditorConstants.READ_STEPS + fineStepsPerPage - 1) / fineStepsPerPage);
    }
}
