package dev.tradcode.groupctl.events;

public record RequestSelectGroup(int trackId, String trackName) implements Event { }
