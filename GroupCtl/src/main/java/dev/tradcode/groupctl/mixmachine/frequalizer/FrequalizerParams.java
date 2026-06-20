package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.Map;

/**
 * The FrequalizerAlt direct-parameter PID table, ported verbatim from
 * {@code FrequalizerDevice.js}'s {@code FREQ_PARAM_IDS}. IDs are the canonical
 * form Bitwig reports after the {@link #PREFIX} is stripped.
 *
 * TODO: Can we make this ID agnostic and index based?
 */
public final class FrequalizerParams {
    private FrequalizerParams() { }

    /** Bitwig prepends this to every reported direct-parameter id. */
    public static final String PREFIX = "ROOT_GENERIC_MODULE/";

    public static final String BAND_SOLO = "CONTENTS/PID10cd4cb4";
    public static final String MODE = "CONTENTS/PID3339a3";

    public static final Map<String, String> IDS = Map.ofEntries(
        // Band 1 (Lowest)
        Map.entry("Q1_ACTIVE", "CONTENTS/PID60a37761"),
        Map.entry("Q1_FREQ", "CONTENTS/PID5e65eb21"),
        Map.entry("Q1_QUALITY", "CONTENTS/PID1fdbd404"),
        Map.entry("Q1_FILTER", "CONTENTS/PID1372e255"),

        // Band 2 (Low)
        Map.entry("Q2_ACTIVE", "CONTENTS/PID10cd7bbf"),
        Map.entry("Q2_FREQ", "CONTENTS/PID47f82203"),
        Map.entry("Q2_QUALITY", "CONTENTS/PID74f25b66"),
        Map.entry("Q2_GAIN", "CONTENTS/PID14682278"),
        Map.entry("Q2_FILTER", "CONTENTS/PID146e6633"),

        // Band 3 (Low Mids)
        Map.entry("Q3_ACTIVE", "CONTENTS/PID78de40dc"),
        Map.entry("Q3_FREQ", "CONTENTS/PID7f826bc6"),
        Map.entry("Q3_QUALITY", "CONTENTS/PIDefa39e9"),
        Map.entry("Q3_GAIN", "CONTENTS/PID9318ad5"),
        Map.entry("Q3_FILTER", "CONTENTS/PID937ce90"),

        // Band 4 (High Mids)
        Map.entry("Q4_ACTIVE", "CONTENTS/PIDf24026a"),
        Map.entry("Q4_FREQ", "CONTENTS/PID5f199778"),
        Map.entry("Q4_QUALITY", "CONTENTS/PID416caa1b"),
        Map.entry("Q4_GAIN", "CONTENTS/PID1d7657e3"),
        Map.entry("Q4_FILTER", "CONTENTS/PID1d7c9b9e"),

        // Band 5 (High)
        Map.entry("Q5_ACTIVE", "CONTENTS/PID651c7971"),
        Map.entry("Q5_FREQ", "CONTENTS/PID5c3cef11"),
        Map.entry("Q5_QUALITY", "CONTENTS/PID2a8313f4"),
        Map.entry("Q5_GAIN", "CONTENTS/PID4b5ee4aa"),
        Map.entry("Q5_FILTER", "CONTENTS/PID4b652865"),

        // Band 6 (Highest)
        Map.entry("Q6_ACTIVE", "CONTENTS/PID74e8446f"),
        Map.entry("Q6_FREQ", "CONTENTS/PID10d85b53"),
        Map.entry("Q6_QUALITY", "CONTENTS/PID1430a8b6"),
        Map.entry("Q6_FILTER", "CONTENTS/PID49039ae3"),

        // Band 7 (Lowest — Mid)
        Map.entry("Q7_ACTIVE", "CONTENTS/PID3ee4685d"),
        Map.entry("Q7_FREQ", "CONTENTS/PID45b188a5"),
        Map.entry("Q7_QUALITY", "CONTENTS/PID9b90288"),
        Map.entry("Q7_FILTER", "CONTENTS/PIDdf3e251"),

        // Band 8 (Low — Mid)
        Map.entry("Q8_ACTIVE", "CONTENTS/PID7990dbb"),
        Map.entry("Q8_FREQ", "CONTENTS/PID1ba97e87"),
        Map.entry("Q8_QUALITY", "CONTENTS/PID579908ea"),
        Map.entry("Q8_GAIN", "CONTENTS/PID5ba80374"),
        Map.entry("Q8_FILTER", "CONTENTS/PID5bae472f"),

        // Band 9 (Low Mids — Mid)
        Map.entry("Q9_ACTIVE", "CONTENTS/PID4157fc58"),
        Map.entry("Q9_FREQ", "CONTENTS/PIDda32eca"),
        Map.entry("Q9_QUALITY", "CONTENTS/PID55b7eded"),
        Map.entry("Q9_GAIN", "CONTENTS/PID29bf551"),
        Map.entry("Q9_FILTER", "CONTENTS/PID2a2390c"),

        // Band 10 (High Mids — Mid)
        Map.entry("Q10_ACTIVE", "CONTENTS/PID54a646e6"),
        Map.entry("Q10_FREQ", "CONTENTS/PID3179317c"),
        Map.entry("Q10_QUALITY", "CONTENTS/PID2c32f51f"),
        Map.entry("Q10_GAIN", "CONTENTS/PID1e778b5f"),
        Map.entry("Q10_FILTER", "CONTENTS/PID1e7dcf1a"),

        // Band 11 (High — Mid)
        Map.entry("Q11_ACTIVE", "CONTENTS/PID7bede26d"),
        Map.entry("Q11_FREQ", "CONTENTS/PID37851495"),
        Map.entry("Q11_QUALITY", "CONTENTS/PID6ddeca78"),
        Map.entry("Q11_GAIN", "CONTENTS/PID582e5ca6"),
        Map.entry("Q11_FILTER", "CONTENTS/PID5834a061"),

        // Band 12 (Highest — Mid)
        Map.entry("Q12_ACTIVE", "CONTENTS/PID5abffe6b"),
        Map.entry("Q12_FREQ", "CONTENTS/PID1c2c8fd7"),
        Map.entry("Q12_QUALITY", "CONTENTS/PID69502e3a"),
        Map.entry("Q12_FILTER", "CONTENTS/PID2439a3df"),

        // Band 13 (Lowest — Side)
        Map.entry("Q13_ACTIVE", "CONTENTS/PID387f0263"),
        Map.entry("Q13_FREQ", "CONTENTS/PID73db68df"),
        Map.entry("Q13_QUALITY", "CONTENTS/PID4371a942"),
        Map.entry("Q13_FILTER", "CONTENTS/PID4b5945d7"),

        // Band 14 (Low — Side)
        Map.entry("Q14_ACTIVE", "CONTENTS/PID133a7c1"),
        Map.entry("Q14_FREQ", "CONTENTS/PID49d35ec1"),
        Map.entry("Q14_QUALITY", "CONTENTS/PID1151afa4"),
        Map.entry("Q14_GAIN", "CONTENTS/PID190d66fa"),
        Map.entry("Q14_FILTER", "CONTENTS/PID1913aab5"),

        // Band 15 (Low Mids — Side)
        Map.entry("Q15_ACTIVE", "CONTENTS/PID3af2965e"),
        Map.entry("Q15_FREQ", "CONTENTS/PID3bcd0f04"),
        Map.entry("Q15_QUALITY", "CONTENTS/PIDf7094a7"),
        Map.entry("Q15_GAIN", "CONTENTS/PID400158d7"),
        Map.entry("Q15_FILTER", "CONTENTS/PID40079c92"),

        // Band 16 (High Mids — Side)
        Map.entry("Q16_ACTIVE", "CONTENTS/PID4e40e0ec"),
        Map.entry("Q16_FREQ", "CONTENTS/PID5fa311b6"),
        Map.entry("Q16_QUALITY", "CONTENTS/PID65eb9bd9"),
        Map.entry("Q16_GAIN", "CONTENTS/PID5bdceee5"),
        Map.entry("Q16_FILTER", "CONTENTS/PID5be332a0"),

        // Band 17 (High — Side)
        Map.entry("Q17_ACTIVE", "CONTENTS/PID75887c73"),
        Map.entry("Q17_FREQ", "CONTENTS/PID65aef4cf"),
        Map.entry("Q17_QUALITY", "CONTENTS/PID27977132"),
        Map.entry("Q17_GAIN", "CONTENTS/PID1593c02c"),
        Map.entry("Q17_FILTER", "CONTENTS/PID159a03e7"),

        // Band 18 (Highest — Side)
        Map.entry("Q18_ACTIVE", "CONTENTS/PID545a9871"),
        Map.entry("Q18_FREQ", "CONTENTS/PID4a567011"),
        Map.entry("Q18_QUALITY", "CONTENTS/PID2308d4f4"),
        Map.entry("Q18_FILTER", "CONTENTS/PID619f0765")
    );

    /** The PID for {@code Qn}'s {@code suffix} param, or {@code null} if absent. */
    public static String id(int qNumber, String suffix) {
        return IDS.get("Q" + qNumber + "_" + suffix);
    }
}
