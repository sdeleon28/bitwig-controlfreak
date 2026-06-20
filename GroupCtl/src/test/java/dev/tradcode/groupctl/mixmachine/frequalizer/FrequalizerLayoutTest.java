package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class FrequalizerLayoutTest {

    @Test
    void resolvesTurnsToTheStereoRegionParams() {
        assertEquals(FrequalizerParams.id(2, "FREQ"), FrequalizerLayout.encoderParam(1, 0));
        assertEquals(FrequalizerParams.id(2, "QUALITY"), FrequalizerLayout.encoderParam(5, 0));
        assertEquals(FrequalizerParams.id(2, "GAIN"), FrequalizerLayout.encoderParam(9, 0));
        assertEquals(FrequalizerParams.id(1, "FREQ"), FrequalizerLayout.encoderParam(13, 0));
        assertEquals(FrequalizerParams.id(1, "QUALITY"), FrequalizerLayout.encoderParam(14, 0));
    }

    @Test
    void reTargetsTheSamePositionsOntoTheMidAndSideRegions() {
        assertEquals(FrequalizerParams.id(8, "FREQ"), FrequalizerLayout.encoderParam(1, 1));
        assertEquals(FrequalizerParams.id(14, "FREQ"), FrequalizerLayout.encoderParam(1, 2));
        // MidSolo / SideSolo share their parent region.
        assertEquals(FrequalizerParams.id(8, "FREQ"), FrequalizerLayout.encoderParam(1, 3));
        assertEquals(FrequalizerParams.id(14, "FREQ"), FrequalizerLayout.encoderParam(1, 4));
    }

    @Test
    void filterShiftReroutesAQualityEncoderToTheBandFilter() {
        assertEquals(1, FrequalizerLayout.filterHoldButton(5));
        assertEquals(FrequalizerParams.id(2, "FILTER"), FrequalizerLayout.filterParam(5, 0));
        assertEquals(FrequalizerParams.id(8, "FILTER"), FrequalizerLayout.filterParam(5, 1));
    }

    @Test
    void edgeBandsHaveNoFilterShift() {
        assertEquals(-1, FrequalizerLayout.filterHoldButton(14));
        assertNull(FrequalizerLayout.filterParam(14, 0));
        assertEquals(-1, FrequalizerLayout.filterHoldButton(1));
    }

    @Test
    void mapsButtonsToTheirActiveAndSoloBands() {
        assertEquals(FrequalizerBand.LOW, FrequalizerLayout.activeBandForButton(9));
        assertEquals(FrequalizerBand.LOWEST, FrequalizerLayout.activeBandForButton(13));
        assertEquals(FrequalizerBand.HIGHEST, FrequalizerLayout.activeBandForButton(15));
        assertNull(FrequalizerLayout.activeBandForButton(5));

        assertEquals(FrequalizerBand.LOW, FrequalizerLayout.soloBandForButton(5));
        assertNull(FrequalizerLayout.soloBandForButton(9));
        assertNull(FrequalizerLayout.soloBandForButton(13));
    }

    @Test
    void resolvesActiveParamsAndSoloStepsPerMode() {
        assertEquals(FrequalizerParams.id(2, "ACTIVE"), FrequalizerLayout.activeParam(FrequalizerBand.LOW, 0));
        assertEquals(FrequalizerParams.id(8, "ACTIVE"), FrequalizerLayout.activeParam(FrequalizerBand.LOW, 1));
        assertEquals(2, FrequalizerLayout.soloStep(FrequalizerBand.LOW, 0));
        assertEquals(8, FrequalizerLayout.soloStep(FrequalizerBand.LOW, 1));
        assertEquals(13, FrequalizerLayout.soloStep(FrequalizerBand.LOWEST, 2));
    }

    @Test
    void mapsModePadsToTheirModeValues() {
        assertEquals(0, FrequalizerLayout.modeValueForPad(9));
        assertEquals(1, FrequalizerLayout.modeValueForPad(5));
        assertEquals(2, FrequalizerLayout.modeValueForPad(6));
        assertEquals(3, FrequalizerLayout.modeValueForPad(1));
        assertEquals(4, FrequalizerLayout.modeValueForPad(2));
        assertNull(FrequalizerLayout.modeValueForPad(3));
    }

    @Test
    void buildsTheSixBandViewsForAMode() {
        var bands = FrequalizerLayout.bandsForMode(0);
        assertEquals(6, bands.size());

        var low = bands.stream().filter(b -> b.band() == FrequalizerBand.LOW).findFirst().orElseThrow();
        assertEquals(FrequalizerColors.BAND_LOW, low.color());
        assertEquals(FrequalizerParams.id(2, "ACTIVE"), low.activeParamId());
        assertEquals(3, low.encoderParams().size());

        var lowest = bands.stream().filter(b -> b.band() == FrequalizerBand.LOWEST).findFirst().orElseThrow();
        assertEquals(2, lowest.encoderParams().size());
    }
}
