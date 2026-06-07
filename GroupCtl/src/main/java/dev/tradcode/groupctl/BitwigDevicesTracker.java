package dev.tradcode.groupctl;

import java.util.ArrayList;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.CursorTrack;
import com.bitwig.extension.controller.api.DeviceBank;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.BitwigDevice;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSelectDevice;

class DeviceCache {
    int id;
    String name;
    boolean exists;
    boolean isNested;
    boolean isSelected; // TODO???
    boolean isExpanded;
    boolean isRcSectionVisible;
    boolean isWindowOpen;
    boolean isPlugin;
}

public class BitwigDevicesTracker implements IEventBusSubscriber {
    static int DEVICE_COUNT = 16;
    static int RC_COUNT = 16;

    IEventBus bus;
    DeviceCache[] rawCache = new DeviceCache[DEVICE_COUNT];
    boolean cacheDirty = false;
    int selectedTrackId;
    CursorTrack cursorTrack;
    CursorDevice cursorDevice;
    DeviceBank cursorDeviceBank;

    public BitwigDevicesTracker(
        IEventBus bus,
        ControllerHost host
    ) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.cursorTrack = host.createCursorTrack(
            "groupctl-device-cursor", "Device Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();
        this.cursorDeviceBank = this.cursorTrack.createDeviceBank(DEVICE_COUNT);
        for (int i = 0; i < DEVICE_COUNT; i++) {
            rawCache[i] = new DeviceCache();
            rawCache[i].id = i;
            var d = this.cursorDeviceBank.getDevice(i);
            d.exists().markInterested();
            d.name().markInterested();
            final int j = i;
            d.name().addValueObserver(v -> {
                rawCache[j].name = v;
                cacheDirty = true;
            });
            d.exists().addValueObserver(v -> {
                rawCache[j].exists = v;
                cacheDirty = true;
            });
        }
    }

    private BitwigDevice cacheToDeviceDef(DeviceCache d) {
        BitwigDevice bd = new BitwigDevice();
        bd.id = d.id;
        bd.name = d.name;
        bd.exists = d.exists;
        return bd;
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
        var defs = new ArrayList<BitwigDevice>();
        for (int i = 0; i < DEVICE_COUNT; i++) if (rawCache[i].exists)
            defs.add(cacheToDeviceDef(rawCache[i]));
        this.bus.send(
            new DevicesSchemaChanged(defs)
        );
    }

    public void on(Event event) {
        switch (event) {
            case BitwigTrackSelected(int id) -> {
                this.selectedTrackId = id;
            }
            case RequestSelectDevice(int id) -> {
                for (int i = 0; i < DEVICE_COUNT; i++) {
                    var d = this.cursorDeviceBank.getDevice(i);
                    if (i != id) {
                        d.isRemoteControlsSectionVisible().set(false);
                        d.isExpanded().set(false);
                    } else {
                        d.isRemoteControlsSectionVisible().set(true);
                        d.isExpanded().set(true);
                    }
                }
                this.cursorDevice.selectDevice(
                    this.cursorDeviceBank.getDevice(id)
                );
            }
            default -> { }
        }
    }
}
