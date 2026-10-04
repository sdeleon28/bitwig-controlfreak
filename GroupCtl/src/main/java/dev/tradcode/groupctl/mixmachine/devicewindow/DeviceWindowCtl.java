package dev.tradcode.groupctl.mixmachine.devicewindow;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusDeviceWindow;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

/**
 * A device pad moves Bitwig's cursor after the grab is announced, so the window
 * is focused once the cursor reaches the grabbed device. Send B grabs the device
 * the cursor is already on, which focuses it right away.
 */
public class DeviceWindowCtl implements IEventBusSubscriber {
    IEventBus bus;
    String cursorName;
    String wanted;

    public DeviceWindowCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case DeviceGrabbed(String name) -> {
                this.wanted = name;
                this.focusIfReached();
            }
            case CursorDeviceNameChanged(String name) -> {
                this.cursorName = name;
                this.focusIfReached();
            }
            default -> { }
        }
    }

    private void focusIfReached() {
        if (this.wanted == null || !this.wanted.equals(this.cursorName))
            return;
        this.wanted = null;
        this.bus.send(new RequestFocusDeviceWindow());
    }
}
