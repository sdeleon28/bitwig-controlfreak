package dev.tradcode.groupctl.palette.events;

import dev.tradcode.groupctl.events.Event;

public record PaletteColorPicked(int color) implements Event {
    @Override
    public String toString() {
        return "Color " + this.color;
    }
}
