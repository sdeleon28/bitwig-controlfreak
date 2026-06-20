package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record EditorColumnOffsetChanged(int colOffset) implements Event { }
