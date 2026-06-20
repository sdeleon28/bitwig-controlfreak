package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class FrequalizerDecoderTest {

    @Test
    void roundsNormalizedValueToTheNearestStep() {
        assertEquals(0, FrequalizerDecoder.normalizedToStep(0.0, 5));
        assertEquals(4, FrequalizerDecoder.normalizedToStep(1.0, 5));
        assertEquals(3, FrequalizerDecoder.normalizedToStep(0.75, 5));
    }

    @Test
    void decodesTheFiveModeSteps() {
        assertEquals(0, FrequalizerDecoder.mode(0.0));
        assertEquals(1, FrequalizerDecoder.mode(0.25));
        assertEquals(2, FrequalizerDecoder.mode(0.5));
        assertEquals(3, FrequalizerDecoder.mode(0.75));
        assertEquals(4, FrequalizerDecoder.mode(1.0));
    }

    @Test
    void decodesTheSoloedBandByNameAcrossRegions() {
        assertNull(FrequalizerDecoder.soloedBand(0.0));
        assertEquals(FrequalizerBand.LOWEST, FrequalizerDecoder.soloedBand(1.0 / 18));
        assertEquals(FrequalizerBand.LOW, FrequalizerDecoder.soloedBand(2.0 / 18));
        assertEquals(FrequalizerBand.HIGHEST, FrequalizerDecoder.soloedBand(6.0 / 18));
        // step 8 sits in the mid region but still names the LOW band.
        assertEquals(FrequalizerBand.LOW, FrequalizerDecoder.soloedBand(8.0 / 18));
        assertEquals(FrequalizerBand.HIGHEST, FrequalizerDecoder.soloedBand(18.0 / 18));
    }

    @Test
    void readsActiveFromTheHalfwayThreshold() {
        assertFalse(FrequalizerDecoder.isActive(0.0));
        assertTrue(FrequalizerDecoder.isActive(1.0));
        assertTrue(FrequalizerDecoder.isActive(0.5));
        assertFalse(FrequalizerDecoder.isActive(0.49));
    }

    @Test
    void scalesRingsToTheSevenBitRange() {
        assertEquals(0, FrequalizerDecoder.ring(0.0));
        assertEquals(127, FrequalizerDecoder.ring(1.0));
        assertEquals(64, FrequalizerDecoder.ring(0.5));
    }
}
