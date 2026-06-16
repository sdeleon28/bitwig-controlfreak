package dev.tradcode.groupctl.mixmachine.events;

import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class BitwigTrack {
    public Integer id; // index of the track in our internal cache
    public Integer channelIndex; // bw channel index
    public String name;
    public boolean isGroup;
    public boolean mute;
    public boolean solo;
    public boolean rec;
    public int depth; // (0=top, 1=child, 2=grandchild)
    public ArrayList<BitwigTrack> children;
    public String color;
    public boolean isSelectedInEditor;
    public boolean isSelectedInMixer;
    // for init only
    public double volume;
    public double pan;

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof BitwigTrack))
            return false;
        BitwigTrack o = (BitwigTrack) other;
        return (
            this.id == o.id
            && this.channelIndex == o.channelIndex
            && this.name == o.name
            && this.isGroup == o.isGroup
            && this.mute == o.mute
            && this.solo == o.solo
            && this.rec == o.rec
            && this.depth == o.depth
            && this.children.equals(o.children)
            && this.color == o.color
            && this.isSelectedInEditor == o.isSelectedInEditor
            && this.isSelectedInMixer == o.isSelectedInMixer
            // purposefully exclude volume / pan here
        );
    }


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
        String r = this.rec ? "R" : "-";
        String out = name
            + " | "
            + s
            + m
            + r
            + " -> "
            + getPosition()
            + " ["
            + this.color
            + "]"
            + "\n";
        for (BitwigTrack t : children) {
            String[] lines = t.toString().split("\n");
            for (String l : lines)
                out += "    " + l + "\n";
        }
        return out;
    }
}
