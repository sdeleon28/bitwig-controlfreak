package dev.tradcode.groupctl.mixmachine.devicedetail;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Device-level controls that live in the top-right quadrant while a generic
 * device is selected. Currently just the on/off toggle; more controls can join
 * here.
 */
public class DeviceDetail {
    public DeviceDetail(IEventBus bus, ControllerHost host) {
        new LaunchpadDeviceToggleCtl(bus);
        new BitwigDeviceToggleTracker(bus, host);
    }
}
