package dev.tradcode.groupctl.mixmachine;

import java.util.List;

/**
 * Re-usable test fixture mirroring `complete_fixture` from
 * groupctl-prototype/fixtures.py.
 *
 * <p>It describes a realistic, deeply-nested session laid out as a flat,
 * depth-first list of tracks (the same order Bitwig's track bank would report
 * them in) and knows how to populate a {@link BitwigSchemaTracker}'s raw cache
 * with it. Drop it into any test that needs a non-trivial schema:
 *
 * <pre>{@code
 *   BitwigSchemaTracker tracker = new BitwigSchemaTracker(null, bus);
 *   CompleteFixture.apply(tracker);
 *   tracker.flush();
 * }</pre>
 */
public class CompleteFixture {

    static final String CYAN = "68,200,254";
    static final String GOLD = "216,156,14";
    static final String RED = "216,46,34";
    static final String BLUE = "86,96,198";
    static final String PURPLE = "148,72,202";
    static final String MAGENTA = "216,56,110";
    static final String YELLOW = "228,182,76";
    static final String GREEN = "0,156,68";
    static final String AQUA = "0,166,146";

    /** A single flat track entry. Mute/solo are always clear in this fixture. */
    record Entry(String name, boolean isGroup, String trackType, String color) { }

    private static Entry group(String name, String color) {
        return new Entry(name, true, "Group", color);
    }

    private static Entry track(String name, String color) {
        return new Entry(name, false, "Audio", color);
    }

    /** The fixture in flat, depth-first order. */
    static final List<Entry> ENTRIES = List.of(
        group("top refs (13)", CYAN),
        track("ref1 (1)", CYAN),
        track("ref2 (2)", CYAN),
        track("ref3 (3)", CYAN),
        track("ref4 (4)", CYAN),

        group("top vox (14)", CYAN),
        track("vox main (1)", CYAN),
        track("vox main adlibs (2)", CYAN),
        track("vox feat (3)", CYAN),
        track("vox feat adlibs (4)", CYAN),
        track("vox harm 1 (5)", CYAN),
        track("vox harm 2 (6)", CYAN),
        track("vox harm 3 (7)", CYAN),
        track("vox harm 4 (8)", CYAN),

        group("top inst (15)", GOLD),
        group("gtrs (1)", RED),
        track("gtr main (1)", BLUE),
        track("gtr lead (2)", RED),
        track("gtr fx (3)", PURPLE),
        track("gtr synth (4)", MAGENTA),
        group("bass (2)", BLUE),
        track("bass di (1)", BLUE),
        track("bass lo (2)", PURPLE),
        track("bass hi (3)", YELLOW),
        track("bass dist (4)", RED),
        track("bass synth (5)", MAGENTA),
        group("synth (3)", MAGENTA),
        track("808 (1)", BLUE),
        track("lead (2)", RED),
        track("pad (2)", CYAN),
        group("drms (4)", GREEN),
        track("okw (1)", GREEN),
        track("trap machine (2)", YELLOW),
        track("fx kit (3)", MAGENTA),
        group("casuarinas (12)", YELLOW),
        track("handpan (1)", YELLOW),
        track("cuenco (2)", RED),
        track("ribbit (3)", GREEN),
        track("oink (4)", AQUA)
    );

    /**
     * Populate {@code tracker}'s raw cache with the fixture, padding every
     * remaining slot with a non-existent track (mirroring how the simple-group
     * test fills the rest of the bank).
     */
    static void apply(BitwigSchemaTracker tracker) {
        int id = 0;
        for (var e : ENTRIES)
            tracker._setRawTrackCache(id, cacheFor(id++, e, true));

        // Pad every remaining slot with a non-existent track.
        var blank = new Entry("", false, "", "");
        for (int i = id; i < tracker.TRACKS_COUNT; i++)
            tracker._setRawTrackCache(i, cacheFor(i, blank, false));
    }

    private static TrackCache cacheFor(int id, Entry e, boolean exists) {
        var t = new TrackCache();
        t.exists = exists;
        t.id = id;
        t.name = e.name();
        t.isGroup = e.isGroup();
        t.mute = false;
        t.solo = false;
        t.trackType = e.trackType();
        t.channelIndex = id;
        t.color = e.color();
        return t;
    }
}
