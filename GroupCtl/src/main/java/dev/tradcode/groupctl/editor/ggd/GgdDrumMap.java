package dev.tradcode.groupctl.editor.ggd;

/**
 * The Get Good Drums note layout: a fixed, non-chromatic row-to-key map that
 * replaces the editor's default mapping when the clip lives on a track whose
 * name contains "ggd". Each grid row is one drum voice, indexed top-down (row 0
 * is the top launchpad row, row 7 the bottom), matching the grid the quantizer
 * builds. Keys are the MIDI notes for each voice (C1 = 36, Bitwig's convention).
 */
public final class GgdDrumMap {
    private GgdDrumMap() { }

    /** Global page 3, the editor's top page. */
    private static final int[] TOP = {
        82, // A#4 — Crash 2
        80, // G#4 — Crash 1
        77, // F4  — China
        75, // D#4 — Ride Bell
        73, // C#4 — Ride
        71, // B3  — Tom 3
        68, // G#3 — Tom 2
        66, // F#3 — Tom 1
    };

    /** Global page 4, the editor's bottom page. */
    private static final int[] BOTTOM = {
        54, // F#2 — HH4
        56, // G#2 — HH3
        59, // B2  — HH2
        55, // G2  — HH1
        63, // D#3 — Snare 2
        61, // C#3 — Snare 1
        62, // D3  — Kick 2
        60, // C3  — Kick 1
    };

    public static boolean matches(String trackName) {
        return trackName != null && trackName.toLowerCase().contains("ggd");
    }

    /** Keys for the eight grid rows of the named page, top row first. */
    public static int[] rowKeys(boolean topPage) {
        return (topPage ? TOP : BOTTOM).clone();
    }
}
