package dev.tradcode.groupctl.events;

public record SendValueUpdated(int trackId, int sendId, double value) implements Event { }
