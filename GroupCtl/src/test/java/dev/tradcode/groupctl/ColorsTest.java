package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ColorsTest {

    @Test
    void mapsKnownBitwigColorToTwisterIndex() {
        assertEquals(123, Colors.toTwister("86,96,198"));   // blue
        assertEquals(31, Colors.toTwister("200,200,200"));  // white
        assertEquals(93, Colors.toTwister("208,184,218"));  // lightest purple
    }

    @Test
    void mapsKnownBitwigColorToLaunchpadIndex() {
        assertEquals(69, Colors.toLaunchpad("86,96,198"));  // blue
        assertEquals(70, Colors.toLaunchpad("200,200,200"));// white
        assertEquals(56, Colors.toLaunchpad("208,184,218"));// lightest purple
    }

    @Test
    void unmappedColorFallsBackToOff() {
        assertEquals(Colors.OFF, Colors.toTwister("1,2,3"));
        assertEquals(Colors.OFF, Colors.toLaunchpad("1,2,3"));
    }

    @Test
    void blackMapsToOffOnBothDevices() {
        assertEquals(0, Colors.toTwister("84,84,82"));
        assertEquals(0, Colors.toLaunchpad("84,84,82"));
    }

    @Test
    void coversAllTwentySevenSwatches() {
        assertEquals(27, Colors.BITWIG_TO_TWISTER.size());
        // 27 swatches + 1 alias for green
        assertEquals(28, Colors.BITWIG_TO_LAUNCHPAD.size());
    }
}
