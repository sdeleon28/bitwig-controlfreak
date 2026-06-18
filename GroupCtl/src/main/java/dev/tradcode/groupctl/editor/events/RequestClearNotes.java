package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record RequestClearNotes(int key, double startBeat, double endBeat) implements Event { }
