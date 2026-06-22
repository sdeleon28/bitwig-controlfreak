package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record EditorPlaybackPosition(double beat) implements Event { }
