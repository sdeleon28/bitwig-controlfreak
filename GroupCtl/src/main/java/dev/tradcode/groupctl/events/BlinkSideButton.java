package dev.tradcode.groupctl.events;

public record BlinkSideButton(SideButton btn, int color) implements Event { }
