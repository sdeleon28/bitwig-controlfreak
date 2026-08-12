package dev.tradcode.groupctl.baseexplorer.events;

public record GridSlot(
    boolean empty,
    int color,
    boolean selected,
    boolean playing,
    double startBeat,
    double endBeat
) { }
