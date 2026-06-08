package dev.tradcode.groupctl.events;

public record RcValueChanged(int id, double value) implements Event { }
