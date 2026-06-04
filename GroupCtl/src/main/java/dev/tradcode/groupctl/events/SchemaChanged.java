package dev.tradcode.groupctl.events;

import java.util.ArrayList;

public record SchemaChanged(ArrayList<BitwigTrack> schema)
    implements Event {

    @Override
    public String toString() {
        String out = "========================================\n";
        for (BitwigTrack t : schema)
            out += t.toString();
        out += "========================================\n";
        return out;
    }
}
