package dev.tradcode.groupctl.events;

/** The four side buttons of the MIDI Fighter Twister that don't switch banks. */
public enum TwisterSideButton {
    TOP_LEFT(8),
    BOTTOM_LEFT(10),
    TOP_RIGHT(11),
    BOTTOM_RIGHT(13);

    private final int cc;

    TwisterSideButton(int cc) {
        this.cc = cc;
    }

    public static TwisterSideButton fromCc(int cc) {
        for (var b : values())
            if (b.cc == cc)
                return b;
        return null;
    }
}
