package dev.tradcode.groupctl.mixmachine.devicewindow;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusCursorDeviceWindow;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusDeviceWindow;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;

/**
 * A pad grab names its slot on the selected track, so that exact device's
 * window is focused — the cursor lags behind and may still sit on a same-named
 * device of the previous track. Send B grabs the device the cursor is already
 * on, so its window is focused through the cursor.
 */
public class DeviceWindowCtl implements IEventBusSubscriber {
    IEventBus bus;
    int trackId = -1;
    int pendingSlot = -1;

    public DeviceWindowCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case BitwigTrackSelected(int id) -> this.trackId = id;
            case RequestSelectDevice(int id) -> this.pendingSlot = id;
            case DeviceGrabbed(String name) -> {
                if (this.pendingSlot != -1 && this.trackId >= 0)
                    this.bus.send(new RequestFocusDeviceWindow(this.trackId, this.pendingSlot));
                else
                    this.bus.send(new RequestFocusCursorDeviceWindow());
                this.pendingSlot = -1;
            }
            default -> { }
        }
    }
}
