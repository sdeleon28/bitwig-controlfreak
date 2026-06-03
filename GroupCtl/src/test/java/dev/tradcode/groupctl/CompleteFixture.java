package dev.tradcode.groupctl;

import java.util.ArrayList;
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
class CompleteFixture {

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
    static class Entry {
        final String name;
        final boolean isGroup;
        final String trackType;
        final String color;

        Entry(String name, boolean isGroup, String trackType, String color) {
            this.name = name;
            this.isGroup = isGroup;
            this.trackType = trackType;
            this.color = color;
        }
    }

    private static Entry group(String name, String color) {
        return new Entry(name, true, "Group", color);
    }

    private static Entry track(String name, String color) {
        return new Entry(name, false, "Audio", color);
    }

    /** The fixture in flat, depth-first order. */
    static final List<Entry> ENTRIES = new ArrayList<Entry>();
    static {
        ENTRIES.add(group("top refs (13)", CYAN));
        ENTRIES.add(track("ref1 (1)", CYAN));
        ENTRIES.add(track("ref2 (2)", CYAN));
        ENTRIES.add(track("ref3 (3)", CYAN));
        ENTRIES.add(track("ref4 (4)", CYAN));

        ENTRIES.add(group("top vox (14)", CYAN));
        ENTRIES.add(track("vox main (1)", CYAN));
        ENTRIES.add(track("vox main adlibs (2)", CYAN));
        ENTRIES.add(track("vox feat (3)", CYAN));
        ENTRIES.add(track("vox feat adlibs (4)", CYAN));
        ENTRIES.add(track("vox harm 1 (5)", CYAN));
        ENTRIES.add(track("vox harm 2 (6)", CYAN));
        ENTRIES.add(track("vox harm 3 (7)", CYAN));
        ENTRIES.add(track("vox harm 4 (8)", CYAN));

        ENTRIES.add(group("top inst (15)", GOLD));
        ENTRIES.add(group("gtrs (1)", RED));
        ENTRIES.add(track("gtr main (1)", BLUE));
        ENTRIES.add(track("gtr lead (2)", RED));
        ENTRIES.add(track("gtr fx (3)", PURPLE));
        ENTRIES.add(track("gtr synth (4)", MAGENTA));
        ENTRIES.add(group("bass (2)", BLUE));
        ENTRIES.add(track("bass di (1)", BLUE));
        ENTRIES.add(track("bass lo (2)", PURPLE));
        ENTRIES.add(track("bass hi (3)", YELLOW));
        ENTRIES.add(track("bass dist (4)", RED));
        ENTRIES.add(track("bass synth (5)", MAGENTA));
        ENTRIES.add(group("synth (3)", MAGENTA));
        ENTRIES.add(track("808 (1)", BLUE));
        ENTRIES.add(track("lead (2)", RED));
        ENTRIES.add(track("pad (2)", CYAN));
        ENTRIES.add(group("drms (4)", GREEN));
        ENTRIES.add(track("okw (1)", GREEN));
        ENTRIES.add(track("trap machine (2)", YELLOW));
        ENTRIES.add(track("fx kit (3)", MAGENTA));
        ENTRIES.add(group("casuarinas (12)", YELLOW));
        ENTRIES.add(track("handpan (1)", YELLOW));
        ENTRIES.add(track("cuenco (2)", RED));
        ENTRIES.add(track("ribbit (3)", GREEN));
        ENTRIES.add(track("oink (4)", AQUA));
    }

    /**
     * Populate {@code tracker}'s raw cache with the fixture, padding every
     * remaining slot with a non-existent track (mirroring how the simple-group
     * test fills the rest of the bank).
     */
    static void apply(BitwigSchemaTracker tracker) {
        int id = 0;
        for (Entry e : ENTRIES) {
            TrackCache t = new TrackCache();
            t.exists = true;
            t.id = id;
            t.name = e.name;
            t.isGroup = e.isGroup;
            t.mute = false;
            t.solo = false;
            t.trackType = e.trackType;
            t.channelIndex = id;
            t.color = e.color;
            tracker._setRawTrackCache(id, t);
            id++;
        }
        for (int i = id; i < tracker.TRACKS_COUNT; i++) {
            TrackCache t = new TrackCache();
            t.exists = false;
            t.id = i;
            t.name = "";
            t.isGroup = false;
            t.mute = false;
            t.solo = false;
            t.trackType = "";
            t.channelIndex = i;
            t.color = "";
            tracker._setRawTrackCache(i, t);
        }
    }
}
