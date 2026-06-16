package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record SendsChanged(List<BitwigSend> sends) implements Event { }
