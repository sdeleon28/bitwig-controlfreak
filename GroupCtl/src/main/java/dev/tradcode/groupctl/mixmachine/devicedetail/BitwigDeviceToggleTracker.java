package dev.tradcode.groupctl.mixmachine.devicedetail;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.CursorTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.DeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.RequestToggleDevice;

/**
 * Owns a cursor device that follows the native selection and mirrors its
 * on/off state onto the bus, toggling it on request.
 */
public class BitwigDeviceToggleTracker implements IEventBusSubscriber {
    IEventBus bus;
    CursorTrack cursorTrack;
    CursorDevice cursorDevice;

    public BitwigDeviceToggleTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);

        this.cursorTrack = host.createCursorTrack(
            "groupctl-device-toggle-cursor", "Device Toggle Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();
        this.cursorDevice.isEnabled().markInterested();
        this.cursorDevice.isEnabled().addValueObserver(
            v -> this.bus.send(new DeviceEnabledChanged(v))
        );
    }

    public void on(Event event) {
        switch (event) {
            case RequestToggleDevice() -> this.cursorDevice.isEnabled().toggle();
            default -> { }
        }
    }
}
