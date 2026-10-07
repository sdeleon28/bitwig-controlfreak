package dev.tradcode.groupctl.programchange.events;

import dev.tradcode.groupctl.events.Event;

public record ProgramChangeReceived(int program) implements Event { }
