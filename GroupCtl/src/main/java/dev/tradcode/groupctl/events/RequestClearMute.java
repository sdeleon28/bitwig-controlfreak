package dev.tradcode.groupctl.events;

import java.util.List;

public record RequestClearMute(List<Integer> trackIds) implements Event {
    @Override
    public String toString() {
        return "Clear Mute";
    }
}
