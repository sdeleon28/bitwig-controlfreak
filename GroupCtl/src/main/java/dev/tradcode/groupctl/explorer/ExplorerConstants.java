package dev.tradcode.groupctl.explorer;

import java.util.List;

/**
 * Shared explorer constants. Pads are listed in top-left reading order, so pad
 * index 0 is the top-left grid pad (note 81) and index 63 is bottom-right (note
 * 18). The various handlers map between this index and the launchpad note.
 */
public final class ExplorerConstants {
    private ExplorerConstants() { }

    public static final double BEATS_PER_BAR = 4.0;
    public static final int PAGE_SIZE = 64;

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
