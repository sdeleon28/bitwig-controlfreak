package dev.tradcode.groupctl.mixmachine.frequalizer;

/** Translation between quadrant-local pad positions (1-16) and Launchpad notes. */
public final class FrequalizerQuadrant {
    private FrequalizerQuadrant() { }

    static final int SIDE = 4;

    public static int localToNote(int localPad) {
        int local0 = localPad - 1;
        return FrequalizerConstants.QUADRANT_ORIGIN + (local0 / SIDE) * 10 + local0 % SIDE;
    }

    public static int noteToLocal(int note) {
        int row = note / 10 - FrequalizerConstants.QUADRANT_ORIGIN / 10;
        int col = note % 10 - FrequalizerConstants.QUADRANT_ORIGIN % 10;
        if (row < 0 || row >= SIDE || col < 0 || col >= SIDE)
            return -1;
        return row * SIDE + col + 1;
    }
}
