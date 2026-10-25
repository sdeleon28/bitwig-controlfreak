package dev.tradcode.groupctl.events;

/** A side button was released without having taken part in a chord. */
public record TwisterSideButtonClick(TwisterSideButton button) implements Event { }
