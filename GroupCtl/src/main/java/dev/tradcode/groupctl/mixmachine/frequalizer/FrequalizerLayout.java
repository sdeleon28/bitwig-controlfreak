package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * The declarative, behavior-free mapping between Twister encoders / buttons,
 * Launchpad mode pads, and FrequalizerAlt direct parameters.
 *
 * <p>Encoder and button <em>positions</em> are identical across modes; only the
 * Q-region the positions resolve to changes (Stereo → Q1–Q6, Mid → Q7–Q12,
 * Side → Q13–Q18). Every method here is a pure lookup.
 */
public final class FrequalizerLayout {
    private FrequalizerLayout() { }

    public record EncoderParam(int encoder, String paramId) { }

    public record BandView(
        FrequalizerBand band,
        int color,
        String activeParamId,
        List<EncoderParam> encoderParams
    ) { }

    public record ModePad(int localPad, int modeValue, Set<Integer> selectedWhen) { }

    private static final int NONE = -1;

    private record BandPos(
        FrequalizerBand band,
        int color,
        int freqEnc,
        int qualityEnc,
        int gainEnc,
        int activeButton,
        int soloButton,
        int filterHoldButton
    ) { }

    private static final List<BandPos> BANDS = List.of(
        new BandPos(FrequalizerBand.LOW, FrequalizerColors.BAND_LOW, 1, 5, 9, 9, 5, 1),
        new BandPos(FrequalizerBand.LOW_MIDS, FrequalizerColors.BAND_LOW_MIDS, 2, 6, 10, 10, 6, 2),
        new BandPos(FrequalizerBand.HIGH_MIDS, FrequalizerColors.BAND_HIGH_MIDS, 3, 7, 11, 11, 7, 3),
        new BandPos(FrequalizerBand.HIGH, FrequalizerColors.BAND_HIGH, 4, 8, 12, 12, 8, 4),
        new BandPos(FrequalizerBand.LOWEST, FrequalizerColors.BAND_LOWEST, 13, 14, NONE, 13, NONE, NONE),
        new BandPos(FrequalizerBand.HIGHEST, FrequalizerColors.BAND_HIGHEST, 15, 16, NONE, 15, NONE, NONE)
    );

    private static final List<ModePad> MODE_PADS = List.of(
        new ModePad(9, 0, Set.of(0)),
        new ModePad(5, 1, Set.of(1, 3)),
        new ModePad(6, 2, Set.of(2, 4)),
        new ModePad(1, 3, Set.of(3)),
        new ModePad(2, 4, Set.of(4))
    );

    /** Stereo (0) → region 0, Mid/MidSolo (1/3) → region 1, Side/SideSolo (2/4) → region 2. */
    private static int regionGroup(int modeStep) {
        return switch (modeStep) {
            case 1, 3 -> 1;
            case 2, 4 -> 2;
            default -> 0;
        };
    }

    private static int qNumber(FrequalizerBand band, int modeStep) {
        return regionGroup(modeStep) * 6 + band.ordinal() + 1;
    }

    public static List<BandView> bandsForMode(int modeStep) {
        var views = new ArrayList<BandView>();
        for (BandPos b : BANDS) {
            int q = qNumber(b.band(), modeStep);
            var encoders = new ArrayList<EncoderParam>();
            encoders.add(new EncoderParam(b.freqEnc(), FrequalizerParams.id(q, "FREQ")));
            encoders.add(new EncoderParam(b.qualityEnc(), FrequalizerParams.id(q, "QUALITY")));
            if (b.gainEnc() != NONE)
                encoders.add(new EncoderParam(b.gainEnc(), FrequalizerParams.id(q, "GAIN")));
            views.add(new BandView(b.band(), b.color(), FrequalizerParams.id(q, "ACTIVE"), encoders));
        }
        return views;
    }

    public static List<ModePad> modePads() {
        return MODE_PADS;
    }

    public static Integer modeValueForPad(int localPad) {
        for (ModePad p : MODE_PADS)
            if (p.localPad() == localPad)
                return p.modeValue();
        return null;
    }

    /** The FREQ / QUALITY / GAIN param an encoder turn writes, or {@code null}. */
    public static String encoderParam(int encoder, int modeStep) {
        for (BandPos b : BANDS) {
            int q = qNumber(b.band(), modeStep);
            if (encoder == b.freqEnc()) return FrequalizerParams.id(q, "FREQ");
            if (encoder == b.qualityEnc()) return FrequalizerParams.id(q, "QUALITY");
            if (encoder == b.gainEnc()) return FrequalizerParams.id(q, "GAIN");
        }
        return null;
    }

    /** The freq-encoder button that filter-shifts {@code encoder}, or {@code -1}. */
    public static int filterHoldButton(int encoder) {
        for (BandPos b : BANDS)
            if (encoder == b.qualityEnc() && b.filterHoldButton() != NONE)
                return b.filterHoldButton();
        return NONE;
    }

    /** The FILTER param a filter-shifted quality encoder writes, or {@code null}. */
    public static String filterParam(int encoder, int modeStep) {
        for (BandPos b : BANDS)
            if (encoder == b.qualityEnc() && b.filterHoldButton() != NONE)
                return FrequalizerParams.id(qNumber(b.band(), modeStep), "FILTER");
        return null;
    }

    public static FrequalizerBand activeBandForButton(int button) {
        for (BandPos b : BANDS)
            if (b.activeButton() == button)
                return b.band();
        return null;
    }

    public static FrequalizerBand soloBandForButton(int button) {
        for (BandPos b : BANDS)
            if (b.soloButton() == button)
                return b.band();
        return null;
    }

    public static String activeParam(FrequalizerBand band, int modeStep) {
        return FrequalizerParams.id(qNumber(band, modeStep), "ACTIVE");
    }

    public static int soloStep(FrequalizerBand band, int modeStep) {
        return qNumber(band, modeStep);
    }
}
