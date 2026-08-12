package dev.tradcode.groupctl.transpose;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TransposeMappingTest {

    @Test
    void marksDevicesWhoseNameEndsWithTheMarker() {
        assertTrue(TransposeMapping.isMarked("HyperTune Metal {T}"));
    }

    @Test
    void toleratesTrailingWhitespaceFromRenaming() {
        assertTrue(TransposeMapping.isMarked("Serum {T} "));
    }

    @Test
    void leavesUnmarkedDevicesAlone() {
        assertFalse(TransposeMapping.isMarked("HyperTune Metal"));
        assertFalse(TransposeMapping.isMarked("{T} leading is not the convention"));
        assertFalse(TransposeMapping.isMarked(null));
    }

    @Test
    void picksTheOverrideForAKnownDeviceRegardlessOfSurroundingRename() {
        var quirky = new TransposeTarget(java.util.List.of("Root"), -24, 24);

        assertEquals(quirky, TransposeMapping.targetFor(
            "Bass HyperTune Metal {T}", java.util.Map.of("HyperTune", quirky)));
    }

    @Test
    void fallsBackToTheDefaultAliasesForAnUnknownDevice() {
        var quirky = new TransposeTarget(java.util.List.of("Root"), -24, 24);

        assertEquals(TransposeMapping.DEFAULT, TransposeMapping.targetFor(
            "Serum {T}", java.util.Map.of("HyperTune", quirky)));
        assertEquals(TransposeMapping.DEFAULT, TransposeMapping.targetFor(null));
    }

    @Test
    void shipsWithNoOverridesSoEveryDeviceStartsOnTheVerifiedDefault() {
        assertTrue(TransposeMapping.OVERRIDES.isEmpty(),
            "a row must be earned by an observed failure, not guessed");
        assertEquals(TransposeMapping.DEFAULT,
            TransposeMapping.targetFor("Archetype Gojira X {T}"));
    }

    @Test
    void mapsSemitonesOntoTheParametersOwnSpan() {
        var target = new TransposeTarget(java.util.List.of("Transpose"), -24, 24);

        assertEquals(48, target.span());
        assertEquals(24, target.offsetFor(0), "zero semitones sits mid-span");
        assertEquals(27, target.offsetFor(3));
        assertEquals(0, target.offsetFor(-24));
        assertEquals(48, target.offsetFor(24));
    }

    @Test
    void clampsRequestsThatOverrunAShallowParameter() {
        // asking for a full octave on a param that only spans a fifth must pin
        // to the top rather than wrap or overshoot
        var target = new TransposeTarget(java.util.List.of("Transpose"), -7, 7);

        assertEquals(14, target.offsetFor(12));
        assertEquals(0, target.offsetFor(-12));
    }
}
