package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import dev.tradcode.groupctl.events.Event;

public record FrequalizerModeChanged(int mode) implements Event { }
