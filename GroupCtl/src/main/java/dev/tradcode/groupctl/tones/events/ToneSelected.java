package dev.tradcode.groupctl.tones.events;

import dev.tradcode.groupctl.events.Event;

public record ToneSelected(String trackName) implements Event { }
