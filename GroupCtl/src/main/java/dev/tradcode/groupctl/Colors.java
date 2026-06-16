package dev.tradcode.groupctl;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class Colors {
    private Colors() {
    }

    public static final int OFF = 0;

    public static final Map<String, Integer> BITWIG_TO_TWISTER;
    public static final Map<String, Integer> BITWIG_TO_LAUNCHPAD;

    static {
        Map<String, Integer> twister = new HashMap<String, Integer>();
        // row 0
        twister.put("84,84,82", 0);     // black
        twister.put("122,122,122", 0);  // gray
        twister.put("200,200,200", 31); // white
        twister.put("134,136,170", 0);  // pale purple
        twister.put("162,120,64", 76);  // brown
        twister.put("198,158,110", 72); // pale brown
        twister.put("86,96,198", 123);  // blue
        twister.put("132,138,224", 126);// pale blue
        twister.put("148,72,202", 107); // purple
        // row 1
        twister.put("216,56,110", 87);  // magenta
        twister.put("216,46,34", 85);   // red
        twister.put("254,86,4", 79);    // orange
        twister.put("216,156,14", 71);  // light orange
        twister.put("114,152,18", 42);  // dark lime
        twister.put("0,156,68", 44);    // green
        twister.put("0,166,146", 37);   // dim aqua
        twister.put("0,152,214", 27);   // teal
        twister.put("188,118,240", 103);// light purple
        // row 2
        twister.put("224,102,142", 88); // pink
        twister.put("236,96,84", 80);   // pinkorange
        twister.put("254,130,60", 71);  // sober orange
        twister.put("228,182,76", 66);  // yellow
        twister.put("160,192,74", 41);  // light lime
        twister.put("62,184,96", 42);   // light green
        twister.put("66,210,182", 36);  // sky blue
        twister.put("68,200,254", 19);  // blinding cyan
        twister.put("208,184,218", 93); // lightest purple
        BITWIG_TO_TWISTER = Collections.unmodifiableMap(twister);

        Map<String, Integer> launchpad = new HashMap<String, Integer>();
        // row 0
        launchpad.put("84,84,82", 0);     // black
        launchpad.put("122,122,122", 103);// gray
        launchpad.put("200,200,200", 70); // white
        launchpad.put("134,136,170", 112);// pale purple
        launchpad.put("162,120,64", 83);  // brown
        launchpad.put("198,158,110", 108);// pale brown
        launchpad.put("86,96,198", 69);   // blue
        launchpad.put("132,138,224", 49); // pale blue
        launchpad.put("148,72,202", 81);  // purple
        // row 1
        launchpad.put("216,56,110", 95);  // magenta
        launchpad.put("216,46,34", 72);   // red
        launchpad.put("254,86,4", 84);    // orange
        launchpad.put("216,156,14", 99);  // light orange
        launchpad.put("114,152,18", 101); // dark lime
        launchpad.put("0,156,68", 87);    // green
        launchpad.put("0,166,146", 34);   // dim aqua
        launchpad.put("0,152,214", 79);   // teal
        launchpad.put("188,118,240", 52); // light purple
        // row 2
        launchpad.put("224,102,142", 53); // pink
        launchpad.put("236,96,84", 83);   // pinkorange
        launchpad.put("254,130,60", 108); // sober orange
        launchpad.put("228,182,76", 109); // yellow
        launchpad.put("160,192,74", 98);  // light lime
        launchpad.put("62,184,96", 31);   // light green
        launchpad.put("66,210,182", 33);  // sky blue
        launchpad.put("68,200,254", 41);  // blinding cyan
        launchpad.put("208,184,218", 56); // lightest purple
        BITWIG_TO_LAUNCHPAD = Collections.unmodifiableMap(launchpad);
    }

    public static int toTwister(String bwColor) {
        Integer v = BITWIG_TO_TWISTER.get(bwColor);
        return v == null ? OFF : v;
    }

    public static int toLaunchpad(String bwColor) {
        Integer v = BITWIG_TO_LAUNCHPAD.get(bwColor);
        return v == null ? OFF : v;
    }
}
