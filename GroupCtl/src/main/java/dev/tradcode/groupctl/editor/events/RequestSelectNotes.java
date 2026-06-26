package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record RequestSelectNotes(List<NoteCell> cells) implements Event { }
