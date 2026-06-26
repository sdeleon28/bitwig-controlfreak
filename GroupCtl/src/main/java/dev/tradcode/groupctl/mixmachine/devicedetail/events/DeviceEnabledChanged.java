package dev.tradcode.groupctl.mixmachine.devicedetail.events;

import dev.tradcode.groupctl.events.Event;

public record DeviceEnabledChanged(boolean enabled) implements Event { }
