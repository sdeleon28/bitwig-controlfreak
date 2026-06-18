package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record EditorResolutionChanged(int denominator) implements Event {
    @Override
    public String toString() {
        return "1/" + this.denominator;
    }
}
