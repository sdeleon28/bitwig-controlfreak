package dev.tradcode.groupctl.events;

import java.util.ArrayList;

public class SchemaChanged implements Event {
    ArrayList<BitwigTrack> schema;

    public SchemaChanged(ArrayList<BitwigTrack> schema) {
        this.schema = schema;
    }

    @Override
    public String toString() {
        String out = "========================================\n";
        for (BitwigTrack t : schema)
            out += t.toString();
        out += "========================================\n";
        return out;
    }
}
