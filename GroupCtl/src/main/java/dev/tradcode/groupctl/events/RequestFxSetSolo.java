package dev.tradcode.groupctl.events;

public record RequestFxSetSolo(int trackId, String trackName, boolean solo) implements Event { }
