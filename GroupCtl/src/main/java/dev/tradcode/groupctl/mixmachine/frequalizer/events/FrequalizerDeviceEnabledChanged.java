package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import dev.tradcode.groupctl.events.Event;

public record FrequalizerDeviceEnabledChanged(boolean enabled) implements Event { }
