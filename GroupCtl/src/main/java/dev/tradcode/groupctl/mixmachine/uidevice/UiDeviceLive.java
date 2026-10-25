package dev.tradcode.groupctl.mixmachine.uidevice;

import dev.tradcode.groupctl.events.IEventBus;

public class UiDeviceLive {
    public UiDeviceLive(IEventBus bus) {
        new TwisterUiDeviceCtl(bus);
    }
}
