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
    void marksDevicesCarryingASignedBaseline() {
        assertTrue(TransposeMapping.isMarked("Note Transpose {T+2}"));
        assertTrue(TransposeMapping.isMarked("Note Transpose {T-3}"));
    }

    @Test
    void readsTheBaselineTheDeviceAlreadySitsAt() {
        // a keyboard pitched up 2 so a Db-major shape sounds in C minor: global
        // zero must leave it at +2, and global +1 must land it on +3
        assertEquals(2, TransposeMapping.baselineOf("Keys {T+2}"));
        assertEquals(-3, TransposeMapping.baselineOf("Keys {T-3}"));
    }

    @Test
    void treatsAPlainMarkerAsNoBaseline() {
        assertEquals(0, TransposeMapping.baselineOf("Archetype Gojira X {T}"));
        assertEquals(0, TransposeMapping.baselineOf("Unmarked"));
        assertEquals(0, TransposeMapping.baselineOf(null));
    }

    @Test
    void baselineShiftsWhereTheEncoderLands() {
        var target = TransposeMapping.DEFAULT;
        int baseline = TransposeMapping.baselineOf("Keys {T+2}");

        // encoder at 0 st -> device sits at its baseline, not at concert pitch
        assertEquals(target.offsetFor(2), target.offsetFor(baseline + 0));
        assertEquals(target.offsetFor(3), target.offsetFor(baseline + 1));
    }

    @Test
    void leavesUnmarkedDevicesAlone() {
        assertFalse(TransposeMapping.isMarked("HyperTune Metal"));
        assertFalse(TransposeMapping.isMarked("{T} leading is not the convention"));
        assertFalse(TransposeMapping.isMarked("Keys {T+} malformed"));
        assertFalse(TransposeMapping.isMarked("Keys {T2}"));
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
    void leavesVerifiedDevicesOnTheDefault() {
        assertEquals(TransposeMapping.DEFAULT,
            TransposeMapping.targetFor("Archetype Gojira X {T}"));
    }

    @Test
    void spansEightOctavesForBitwigsTransposeNoteEffect() {
        // Semi runs -48..+48, so an octave of encoder travel is a quarter of the
        // param's range — writing it against the default's +/-12 would quadruple
        // every move.
        var target = TransposeMapping.targetFor("Note Transpose {T+2}");

        assertEquals(96, target.span());
        assertEquals(48, target.offsetFor(0), "concert pitch sits mid-range");
        assertEquals(50, target.offsetFor(2), "the {T+2} baseline");
        assertEquals(62, target.offsetFor(14), "baseline plus a full octave, unclamped");
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
