package dev.tradcode.groupctl.events;

import java.util.List;

public record RequestClearRec(List<Integer> trackIds) implements Event {
    @Override
    public String toString() {
        return "Clear Rec";
    }
}
