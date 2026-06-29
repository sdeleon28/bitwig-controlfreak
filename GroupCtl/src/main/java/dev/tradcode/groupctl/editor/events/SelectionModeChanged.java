package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record SelectionModeChanged(boolean active) implements Event { }
