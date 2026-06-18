package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record EditorGridChanged(List<EditorSlot> slots, boolean clipExists) implements Event { }
