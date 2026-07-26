package dev.tradcode.groupctl.mixmachine.events;

import dev.tradcode.groupctl.events.Event;

/** Whether a device is currently selected under the UI-following cursor. */
public record CursorDeviceExistsChanged(boolean exists) implements Event { }
