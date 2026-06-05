package dev.tradcode.groupctl.events;

public record VolumeUpdated(int id, double v) implements Event { }
