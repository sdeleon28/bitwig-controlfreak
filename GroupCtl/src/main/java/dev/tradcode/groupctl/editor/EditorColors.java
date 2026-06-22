package dev.tradcode.groupctl.editor;

public final class EditorColors {
    private EditorColors() { }

    public static final int NOTE = 69;             // lit pad: a note falls here (very nice!)
    public static final int ACTIVE_CONTEXT = 5;    // red: pad held as the Twister velocity context
    public static final int RESOLUTION_COLOR = 41; // cyan, mirrors the explorer resolution LEDs
    public static final int PAGE_COLOR = 49;       // purple, mirrors the explorer page LEDs
    public static final int STOP_COLOR = 7;        // dim red, blinks while playing (mirrors explorer)
    public static final int VELOCITY_ENCODER_COLOR = 64; // twister green, marks the armed velocity encoder

    public static final int PAGE_DOT = 49;         // purple: a reachable page on the grid page picker
    public static final int PAGE_DOT_CURRENT = 3;  // white: the current page on the grid page picker
    public static final int PAGER_ARROW = 49;      // purple: left/right arrows flashing in pager mode

    public static final int PLAYHEAD = 45;         // blue: empty cell swept by the play cursor
    public static final int PLAYHEAD_NOTE = 3;     // white: a note struck under the play cursor
}
