package dev.tradcode.groupctl.mixmachine.frequalizer;

public final class FrequalizerConstants {
    private FrequalizerConstants() { }

    /** Activation keys off the focused cursor device carrying this name. */
    public static final String DEVICE_NAME = "Frequalizer Alt";

    /**
     * Bottom-left Launchpad note of the 4x4 quadrant the mode pads live in. The
     * intended home is the top-right quadrant (its bottom-left pad is note 55);
     * the layout is otherwise expressed in quadrant-local positions so it can be
     * dropped onto any quadrant by changing this origin.
     */
    public static final int QUADRANT_ORIGIN = 55;

    // Direct-parameter ranges (resolutions) the gestures write with.
    public static final int MODE_RANGE = 5;
    public static final int BAND_SOLO_RANGE = 19;
    public static final int ACTIVE_RANGE = 2;
    public static final int ENCODER_RANGE = 128;
}
