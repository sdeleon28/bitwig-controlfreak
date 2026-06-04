package dev.tradcode.groupctl.events;

public record RequestSelectTrack(int trackId, String trackName) implements Event { }
