package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

/** The keys the active mapper places on the eight grid rows, top row first. */
public record EditorRowKeysChanged(int[] rowKeys) implements Event { }
