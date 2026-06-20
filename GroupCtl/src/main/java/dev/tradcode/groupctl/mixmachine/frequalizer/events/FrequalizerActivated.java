package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import dev.tradcode.groupctl.events.Event;

public record FrequalizerActivated(boolean active) implements Event { }
