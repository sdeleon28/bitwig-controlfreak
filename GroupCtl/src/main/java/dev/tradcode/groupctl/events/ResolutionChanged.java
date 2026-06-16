package dev.tradcode.groupctl.events;

public record ResolutionChanged(int barsPerPad) implements Event {
    @Override
    public String toString() {
        return this.barsPerPad + " bars/pad";
    }
}
