package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record RequestSetNote(int key, double beat) implements Event { }
