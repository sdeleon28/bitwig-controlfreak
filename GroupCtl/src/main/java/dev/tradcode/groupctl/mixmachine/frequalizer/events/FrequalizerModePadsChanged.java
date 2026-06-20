package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import java.util.List;

import dev.tradcode.groupctl.events.Event;

public record FrequalizerModePadsChanged(List<ModePadSlot> slots) implements Event { }
