package dev.tradcode.groupctl.events;

public record RequestSetSolo(int trackId, String trackName, boolean solo) implements Event { }
