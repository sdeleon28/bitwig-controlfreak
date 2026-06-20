package dev.tradcode.groupctl.mixmachine.frequalizer;

/**
 * Per-band Twister-encoder palette indices and the Launchpad mode-pad colors,
 * ported from {@code FrequalizerTwisterMapper.js} (band colors) and
 * {@code FrequalizerPadMapper.js} (pad colors).
 */
public final class FrequalizerColors {
    private FrequalizerColors() { }

    // Twister palette indices (TwisterPainter.js TwisterPalette).
    public static final int BAND_LOWEST = 1;    // blue1
    public static final int BAND_LOW = 80;      // red1
    public static final int BAND_LOW_MIDS = 44; // green2
    public static final int BAND_HIGH_MIDS = 73;// orange2
    public static final int BAND_HIGH = 70;     // yellow11
    public static final int BAND_HIGHEST = 86;  // red7

    public static final int ENCODER_OFF = 0;

    // Launchpad pad colors.
    public static final int MODE_PAD_SELECTED = 21;
    public static final int MODE_PAD_DESELECTED = 1;
    public static final int MODE_PAD_OFF = 0;
}
