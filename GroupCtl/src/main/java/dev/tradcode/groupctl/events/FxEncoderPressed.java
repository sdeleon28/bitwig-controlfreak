package dev.tradcode.groupctl.events;

public record FxEncoderPressed(String fxName) implements Event {
    @Override
    public String toString() {
        return this.fxName;
    }
}
