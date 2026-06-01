package dev.tradcode.groupctl;

import java.util.ArrayList;

public class BitwigTrack {
    Integer id;
    String name;
    boolean isGroup;
    boolean mute;
    boolean solo;
    int depth; // (0=top, 1=child, 2=grandchild)
    ArrayList<BitwigTrack> children;

    @Override
    public String toString() {
        String s = this.solo ? "S" : "-";
        String m = this.mute ? "M" : "-";
        String out = name + " | " + s + m + "\n";
        for (BitwigTrack t : children) {
            String[] lines = t.toString().split("\n");
            for (String l : lines)
                out += "    " + l + "\n";
        }
        return out;
    }
}
