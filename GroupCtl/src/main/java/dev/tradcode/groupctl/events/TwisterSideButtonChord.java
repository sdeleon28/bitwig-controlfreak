package dev.tradcode.groupctl.events;

/** {@code second} was pressed while {@code first} was held. */
public record TwisterSideButtonChord(TwisterSideButton first, TwisterSideButton second) implements Event {
    public boolean is(TwisterSideButton a, TwisterSideButton b) {
        return (this.first == a && this.second == b) || (this.first == b && this.second == a);
    }
}
