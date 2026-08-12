package dev.tradcode.groupctl.transpose.events;

import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.transpose.MarkedDevice;

public record MarkedDevicesChanged(List<MarkedDevice> devices) implements Event { }
