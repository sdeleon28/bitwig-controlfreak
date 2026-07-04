package dev.tradcode.groupctl.palette;

import java.util.List;

public final class PaletteConstants {
    private PaletteConstants() { }

    public static final int PAGE_SIZE = 64;

    // Pad notes top-left -> bottom-right, matching EditorConstants.PADS, so swatch
    // i (colour colorOffset + i) lands on PADS.get(i).
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
