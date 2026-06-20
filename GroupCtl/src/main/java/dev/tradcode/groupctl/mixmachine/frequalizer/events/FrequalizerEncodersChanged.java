package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import java.util.List;

import dev.tradcode.groupctl.events.Event;

public record FrequalizerEncodersChanged(List<EncoderSlot> slots) implements Event { }
