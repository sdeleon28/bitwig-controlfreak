package dev.tradcode.groupctl.events;

public record RequestFxSelectTrack(int trackId, String trackName) implements Event { }
