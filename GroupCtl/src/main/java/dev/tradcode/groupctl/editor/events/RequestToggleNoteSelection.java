package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record RequestToggleNoteSelection(int key, double startBeat, double endBeat)
    implements Event { }
