package dev.tradcode.groupctl.explorer;

/** Raw launchpad palette indices (not bitwig-mapped) for the project explorer. */
public final class ExplorerColors {
    private ExplorerColors() {
    }

    public static final int WHITE = 3;                 // selection / playhead highlight
    public static final int RESOLUTION_COLOR = 41;     // cyan
    public static final int PAGE_COLOR = 49;           // purple
    public static final int SELECT_COLOR = 5;          // red (selection-mode idle)
    public static final int STOP_COLOR = 7;            // dim red (stop side button)
    public static final int LOOP_COLOR = 41;           // cyan (loop side button)
    public static final int METRONOME_COLOR = 109;     // yellow (metronome side button)
    public static final int RECORD_COLOR = 5;          // red (record side button, mirrors mixer/select red)
}
