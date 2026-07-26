package dev.tradcode.groupctl.mixmachine.uidevice;

import dev.tradcode.groupctl.events.IEventBus;

public class UiDevice {
    public UiDevice(IEventBus bus) {
        new LaunchpadUiDeviceCtl(bus);
    }
}
