package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

import java.util.ArrayList;

public record FxSchemaChanged(ArrayList<BitwigTrack> schema)
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
