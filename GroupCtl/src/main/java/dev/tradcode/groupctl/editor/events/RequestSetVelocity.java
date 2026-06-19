package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record RequestSetVelocity(int key, double startBeat, double endBeat, double velocity) implements Event { }
