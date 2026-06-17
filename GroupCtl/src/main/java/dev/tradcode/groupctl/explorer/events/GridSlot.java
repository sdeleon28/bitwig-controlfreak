package dev.tradcode.groupctl.explorer.events;

public record GridSlot(
    boolean empty,
    int color,
    boolean selected,
    boolean playing,
    double startBeat,
    double endBeat
) { }
