package dev.tradcode.groupctl.tones.events;

import dev.tradcode.groupctl.events.Event;

public record RequestSelectTone(char tone) implements Event { }
