package dev.tradcode.groupctl.tones.events;

import dev.tradcode.groupctl.events.Event;

public record FootswitchReleased(int note) implements Event { }
