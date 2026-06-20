package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import dev.tradcode.groupctl.events.Event;

public record RequestSetFrequalizerParam(String id, int value, int range) implements Event { }
