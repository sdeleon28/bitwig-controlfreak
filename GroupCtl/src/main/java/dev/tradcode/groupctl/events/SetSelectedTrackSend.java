package dev.tradcode.groupctl.events;

public record SetSelectedTrackSend(int trackId, int sendId, double v) implements Event { }
