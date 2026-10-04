package dev.tradcode.groupctl.mixmachine.devicewindow;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusCursorDeviceWindow;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusDeviceWindow;

/**
 * Closes every open device window it can reach (top-level devices of the first
 * {@value #TRACKS} tracks) and opens the window of the requested device, or of
 * the device under a cursor that follows the native selection.
 */
public class BitwigDeviceWindowTracker implements IEventBusSubscriber {
    static final int TRACKS = 64;
    static final int DEVICES_PER_TRACK = 16;

    TrackBank trackBank;
    Device[][] devices = new Device[TRACKS][DEVICES_PER_TRACK];
    CursorDevice cursorDevice;

    public BitwigDeviceWindowTracker(IEventBus bus, ControllerHost host) {
        bus.subscribe(this);
        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            var bank = this.trackBank.getItemAt(t).createDeviceBank(DEVICES_PER_TRACK);
            for (int d = 0; d < DEVICES_PER_TRACK; d++) {
                this.devices[t][d] = bank.getDevice(d);
                this.devices[t][d].isWindowOpen().markInterested();
            }
        }
        this.cursorDevice = host
            .createCursorTrack("groupctl-device-window-cursor", "Device Window Cursor", 0, 0, true)
            .createCursorDevice();
        this.cursorDevice.isWindowOpen().markInterested();
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case RequestFocusDeviceWindow(int trackId, int slot) -> {
                if (trackId >= TRACKS || slot >= DEVICES_PER_TRACK) {
                    this.focus(this.cursorDevice);
                    return;
                }
                this.focus(this.devices[trackId][slot]);
            }
            case RequestFocusCursorDeviceWindow() -> this.focus(this.cursorDevice);
            default -> { }
        }
    }

    private void focus(Device target) {
        for (var track : this.devices)
            for (var device : track)
                if (device != target && device.isWindowOpen().get())
                    device.isWindowOpen().set(false);
        target.isWindowOpen().set(true);
    }
}
