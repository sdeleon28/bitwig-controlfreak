package dev.tradcode.groupctl.tones.events;

import dev.tradcode.groupctl.events.Event;

public record FootswitchPressed(int note) implements Event { }
