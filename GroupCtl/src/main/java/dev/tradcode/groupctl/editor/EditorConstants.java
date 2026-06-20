package dev.tradcode.groupctl.editor;

import java.util.List;

import dev.tradcode.groupctl.Page;

public final class EditorConstants {
    private EditorConstants() { }

    /** Global page holding the editor's top (higher) octave of keys. */
    public static final int PAGE_INDEX = Page.EDITOR.getValue();
    /** Global page holding the editor's bottom octave, with C1 on the last row. */
    public static final int PAGE_INDEX_BOTTOM = Page.EDITOR_BOTTOM.getValue();

    public static final int GRID_ROWS = 8;
    public static final int GRID_COLS = 8;
    public static final int PAGE_SIZE = GRID_ROWS * GRID_COLS;

    /**
     * The editor stacks two vertical pages, so the readable key span is twice the
     * grid height. The bottom page shows {@code [BASE_KEY, BASE_KEY + GRID_ROWS)}
     * and the top page the octave above it.
     */
    public static final int VERTICAL_PAGES = 2;
    public static final int KEY_RANGE = GRID_ROWS * VERTICAL_PAGES;
    /** Largest key offset: the top page's bottom row sits this far above C1. */
    public static final int MAX_KEY_OFFSET = KEY_RANGE - GRID_ROWS;

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
    public static final double READ_BEATS = READ_STEPS * FINE_STEP_BEATS;

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
}
