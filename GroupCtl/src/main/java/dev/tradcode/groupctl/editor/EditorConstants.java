package dev.tradcode.groupctl.editor;

import java.util.List;

public final class EditorConstants {
    private EditorConstants() { }

    public static final int PAGE_INDEX = 2;

    public static final int GRID_ROWS = 8;
    public static final int GRID_COLS = 8;
    public static final int PAGE_SIZE = GRID_ROWS * GRID_COLS;

    /**
     * C1 (the bottom row) is MIDI note 36 — the canonical kick-drum key for
     * GM/GGD drum maps. Each row up is one chromatic semitone higher.
     */
    public static final int BASE_KEY = 36;

    public static final int CHANNEL = 0;
    public static final int VELOCITY = 127;

    /**
     * The clip step grid is read at the finest supported resolution so the
     * quantizer can fold several raw onsets onto a single display pad.
     */
    public static final double FINE_STEP_BEATS = 0.125; // 1/32 note
    public static final int READ_STEPS = 64;            // 8 beats of fine steps

    public static final int DEFAULT_DENOMINATOR = 8;    // 1/8
    public static final List<Integer> DENOMINATORS = List.of(4, 8, 16, 32);

    public static final List<Integer> PADS = List.of(
        81, 82, 83, 84, 85, 86, 87, 88,
        71, 72, 73, 74, 75, 76, 77, 78,
        61, 62, 63, 64, 65, 66, 67, 68,
        51, 52, 53, 54, 55, 56, 57, 58,
        41, 42, 43, 44, 45, 46, 47, 48,
        31, 32, 33, 34, 35, 36, 37, 38,
        21, 22, 23, 24, 25, 26, 27, 28,
        11, 12, 13, 14, 15, 16, 17, 18
    );

    /** Beat span of one column at the given note denominator (1/4 = 1 beat). */
    public static double beatsPerStep(int denominator) {
        return 4.0 / denominator;
    }

    /**
     * How many horizontal pages the fixed read window splits into at the given
     * resolution. The window holds {@link #READ_STEPS} fine steps; a page covers
     * {@link #GRID_COLS} columns, each spanning several fine steps.
     */
    public static int totalPages(int denominator) {
        int fineStepsPerColumn = (int) Math.round(beatsPerStep(denominator) / FINE_STEP_BEATS);
        int fineStepsPerPage = GRID_COLS * fineStepsPerColumn;
        return Math.max(1, (READ_STEPS + fineStepsPerPage - 1) / fineStepsPerPage);
    }

    /** MIDI key for a grid row; the bottom row is C1, ascending upward. */
    public static int keyForRow(int row) {
        return BASE_KEY + (GRID_ROWS - 1 - row);
    }
}
