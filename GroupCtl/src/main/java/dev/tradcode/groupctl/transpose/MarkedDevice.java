package dev.tradcode.groupctl.transpose;

/**
 * A device that opted into global transpose: where it sits and what it is
 * called. Pure data — the Bitwig proxy it stands for never leaves the tracker.
 */
public record MarkedDevice(int track, int slot, String name) { }
