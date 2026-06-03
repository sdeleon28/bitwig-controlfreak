package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class BitwigTrack {
    Integer id; // index of the track in our internal cache
    Integer channelIndex; // bw channel index
    String name;
    boolean isGroup;
    boolean mute;
    boolean solo;
    int depth; // (0=top, 1=child, 2=grandchild)
    ArrayList<BitwigTrack> children;

    public int getPosition() {
        Pattern pattern = Pattern.compile("\\((\\d+)\\)");
        Matcher matcher = pattern.matcher(this.name);
        if (!matcher.find())
            return -1;
        String number = matcher.group(1);
        try {
            return Integer.parseInt(number);
        } catch (NumberFormatException ex) {
            return -1;
        }
    }

    @Override
    public String toString() {
        String s = this.solo ? "S" : "-";
        String m = this.mute ? "M" : "-";
        String out = name + " | " + s + m + " -> " + getPosition() + "\n";
        for (BitwigTrack t : children) {
            String[] lines = t.toString().split("\n");
            for (String l : lines)
                out += "    " + l + "\n";
        }
        return out;
    }
}
