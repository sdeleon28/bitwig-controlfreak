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

    /** A single flat track entry. Mute/solo are always clear in this fixture. */
    static class Entry {
        final String name;
        final boolean isGroup;
        final String trackType;

        Entry(String name, boolean isGroup, String trackType) {
            this.name = name;
            this.isGroup = isGroup;
            this.trackType = trackType;
        }
    }

    private static Entry group(String name) {
        return new Entry(name, true, "Group");
    }

    private static Entry track(String name) {
        return new Entry(name, false, "Audio");
    }

    /** The fixture in flat, depth-first order. */
    static final List<Entry> ENTRIES = new ArrayList<Entry>();
    static {
        ENTRIES.add(group("top refs (13)"));
        ENTRIES.add(track("ref1 (1)"));
        ENTRIES.add(track("ref2 (2)"));
        ENTRIES.add(track("ref3 (3)"));
        ENTRIES.add(track("ref4 (4)"));

        ENTRIES.add(group("top vox (14)"));
        ENTRIES.add(track("vox main (1)"));
        ENTRIES.add(track("vox main adlibs (2)"));
        ENTRIES.add(track("vox feat (3)"));
        ENTRIES.add(track("vox feat adlibs (4)"));
        ENTRIES.add(track("vox harm 1 (5)"));
        ENTRIES.add(track("vox harm 2 (6)"));
        ENTRIES.add(track("vox harm 3 (7)"));
        ENTRIES.add(track("vox harm 4 (8)"));

        ENTRIES.add(group("top inst (15)"));
        ENTRIES.add(group("gtrs (1)"));
        ENTRIES.add(track("gtr main (1)"));
        ENTRIES.add(track("gtr lead (2)"));
        ENTRIES.add(track("gtr fx (3)"));
        ENTRIES.add(track("gtr synth (4)"));
        ENTRIES.add(group("bass (2)"));
        ENTRIES.add(track("bass di (1)"));
        ENTRIES.add(track("bass lo (2)"));
        ENTRIES.add(track("bass hi (3)"));
        ENTRIES.add(track("bass dist (4)"));
        ENTRIES.add(track("bass synth (5)"));
        ENTRIES.add(group("synth (3)"));
        ENTRIES.add(track("808 (1)"));
        ENTRIES.add(track("lead (2)"));
        ENTRIES.add(track("pad (2)"));
        ENTRIES.add(group("drms (4)"));
        ENTRIES.add(track("okw (1)"));
        ENTRIES.add(track("trap machine (2)"));
        ENTRIES.add(track("fx kit (3)"));
        ENTRIES.add(group("casuarinas (12)"));
        ENTRIES.add(track("handpan (1)"));
        ENTRIES.add(track("cuenco (2)"));
        ENTRIES.add(track("ribbit (3)"));
        ENTRIES.add(track("oink (4)"));
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
            tracker._setRawTrackCache(i, t);
        }
    }
}
