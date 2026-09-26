package dev.tradcode.groupctl.events;

public record ResolutionChanged(int barsPerPad, boolean manual) implements Event {
    @Override
    public String toString() {
        return this.barsPerPad + " bars/pad";
    }
}
