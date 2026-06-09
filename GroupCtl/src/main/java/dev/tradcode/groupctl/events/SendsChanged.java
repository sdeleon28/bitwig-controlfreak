package dev.tradcode.groupctl.events;

import java.util.List;

public record SendsChanged(List<BitwigSend> sends) implements Event { }
