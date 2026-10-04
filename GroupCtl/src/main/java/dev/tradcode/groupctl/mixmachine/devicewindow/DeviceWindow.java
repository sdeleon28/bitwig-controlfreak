package dev.tradcode.groupctl.mixmachine.devicewindow;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/** Grabbing a device brings up its window and closes every other device window. */
public class DeviceWindow {
    public DeviceWindow(IEventBus bus, ControllerHost host) {
        new DeviceWindowCtl(bus);
        new BitwigDeviceWindowTracker(bus, host);
    }
}
