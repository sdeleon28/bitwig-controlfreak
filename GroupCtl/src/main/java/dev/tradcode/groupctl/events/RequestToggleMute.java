package dev.tradcode.groupctl.events;

public record RequestToggleMute(int trackId, String trackName) implements Event { }
