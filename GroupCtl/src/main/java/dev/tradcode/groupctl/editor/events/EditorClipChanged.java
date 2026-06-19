package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record EditorClipChanged(boolean exists, double lengthBeats, List<EditorNote> notes) implements Event { }
