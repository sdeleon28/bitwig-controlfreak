package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record RequestColumnScroll(int targetOffset, boolean animate) implements Event { }
