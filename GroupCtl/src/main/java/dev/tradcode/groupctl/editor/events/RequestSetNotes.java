package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record RequestSetNotes(List<NoteCell> cells) implements Event { }
