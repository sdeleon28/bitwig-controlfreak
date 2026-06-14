package dev.tradcode.groupctl.events;

public record PageSelected(int n) implements Event {
    @Override
    public String toString() {
        return "Page " + (this.n + 1);
    }
}
