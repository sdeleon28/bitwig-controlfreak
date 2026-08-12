package dev.tradcode.groupctl.params;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

class ParamIndexTest {

    private static ParamIndex indexOf(String... idsAndNames) {
        var index = new ParamIndex();
        var ids = new String[idsAndNames.length / 2];
        for (int i = 0; i < idsAndNames.length; i += 2)
            ids[i / 2] = idsAndNames[i];
        index.setIds(ids);
        for (int i = 0; i < idsAndNames.length; i += 2)
            index.setName(idsAndNames[i], idsAndNames[i + 1]);
        return index;
    }

    @Test
    void resolvesByLabelRatherThanId() {
        var index = indexOf(
            "CONTENTS/PID5e65eb21", "Drive",
            "CONTENTS/PID1fdbd404", "Transpose");

        assertEquals("CONTENTS/PID1fdbd404", index.resolve(List.of("Transpose")));
    }

    @Test
    void stripsTheReportingPrefixSoLookupsAndWritesAgree() {
        var index = indexOf(ParamIndex.PREFIX + "CONTENTS/PIDab", "Transpose");

        assertEquals("CONTENTS/PIDab", index.resolve(List.of("Transpose")));
    }

    @Test
    void ignoresCaseSpacingAndPunctuationInLabels() {
        var index = indexOf("p1", "PITCH (semi)");

        assertEquals("p1", index.resolve(List.of("pitch semi")));
    }

    @Test
    void triesEveryAliasBeforeFallingBackToSubstrings() {
        // "Pitch Bend" would swallow the alias "Pitch" on a substring pass, but
        // an exact hit on a later alias must win over any substring hit.
        var index = indexOf(
            "p1", "Pitch Bend",
            "p2", "Transpose");

        assertEquals("p2", index.resolve(List.of("Pitch", "Transpose")));
    }

    @Test
    void fallsBackToSubstringWhenNoLabelMatchesExactly() {
        var index = indexOf("p1", "Transpose Amount");

        assertEquals("p1", index.resolve(List.of("Transpose")));
    }

    @Test
    void prefersThePluginsOwnParameterOrderWhenLabelsRepeat() {
        var index = indexOf(
            "p1", "Transpose",
            "p2", "Transpose");

        assertEquals("p1", index.resolve(List.of("Transpose")));
    }

    @Test
    void resolvesToNothingWhenNoLabelMatches() {
        var index = indexOf("p1", "Drive", "p2", "Mix");

        assertNull(index.resolve(List.of("Transpose", "Pitch")));
    }

    @Test
    void listsNearMissesToDriveTheFactFindingLog() {
        var index = indexOf(
            "p1", "Drive",
            "p2", "Pitch Bend",
            "p3", "Fine Pitch");

        var hits = index.namesMatching("pitch");

        assertEquals(2, hits.size());
        assertTrue(hits.get(0).startsWith("Pitch Bend"));
        assertTrue(hits.get(0).contains("p2"), "the id belongs in the log line");
    }

    @Test
    void survivesNamesArrivingBeforeTheIdList() {
        // Bitwig delivers ids and names on separate callbacks with no ordering
        // guarantee, so a name for an id we have not been told about yet must
        // still be resolvable.
        var index = new ParamIndex();
        index.setName("p1", "Transpose");

        assertEquals("p1", index.resolve(List.of("Transpose")));
    }

    @Test
    void prefersTheFreshlyPublishedOrderOverStaleNames() {
        var index = indexOf("p1", "Transpose");
        index.setIds(new String[] { "p9" });
        index.setName("p9", "Transpose");

        assertEquals("p9", index.resolve(List.of("Transpose")),
            "the freshly published order must win");
    }
}
