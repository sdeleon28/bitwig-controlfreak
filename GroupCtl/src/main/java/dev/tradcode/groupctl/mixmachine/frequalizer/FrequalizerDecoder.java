package dev.tradcode.groupctl.mixmachine.frequalizer;

/**
 * Stateless value math. Turns the normalized direct-parameter values Bitwig reports into
 * decoded mode / solo / active / ring data. No bus, no Bitwig.
 */
public final class FrequalizerDecoder {
    private FrequalizerDecoder() { }

    public static int normalizedToStep(double value, int range) {
        return (int) Math.round(value * (range - 1));
    }

    public static int mode(double modeValue) {
        int step = normalizedToStep(modeValue, FrequalizerConstants.MODE_RANGE);
        return Math.min(Math.max(step, 0), FrequalizerConstants.MODE_RANGE - 1);
    }

    /** The soloed band, or {@code null} when {@code BAND_SOLO} is at step 0 (none). */
    public static FrequalizerBand soloedBand(double bandSoloValue) {
        int step = normalizedToStep(bandSoloValue, FrequalizerConstants.BAND_SOLO_RANGE);
        if (step <= 0)
            return null;
        return FrequalizerBand.values()[(step - 1) % 6];
    }

    public static boolean isActive(double activeValue) {
        return activeValue >= 0.5;
    }

    public static int ring(double value) {
        return (int) Math.round(value * 127);
    }
}
