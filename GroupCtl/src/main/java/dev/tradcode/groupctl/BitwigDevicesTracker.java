package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.BitwigDevice;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

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
    IEventBus bus;
    BitwigSchemaTracker schemaTracker;
    static int DEVICE_COUNT = 16;
    ArrayList<DeviceCache[]> trackDeviceCaches = new ArrayList<>();
    // TODO: should be one per cache
    boolean cacheDirty = false;
    TrackBank mainTrackBank;
    int trackId;
    int selectedTrackId;

    public BitwigDevicesTracker(IEventBus bus, BitwigSchemaTracker schemaTracker) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.schemaTracker = schemaTracker;
        this.mainTrackBank = schemaTracker.getTrackBank();
        for (int trackI = 0; trackI < mainTrackBank.getSizeOfBank(); trackI++) {
            var rawCache = new DeviceCache[DEVICE_COUNT];
            var devices = this.mainTrackBank.getItemAt(trackI)
                .createDeviceBank(DEVICE_COUNT);
            for (int deviceI = 0; deviceI < DEVICE_COUNT; deviceI++) {
                rawCache[deviceI] = new DeviceCache();
                rawCache[deviceI].id = deviceI;
                final int j = deviceI;
                Device d = devices.getDevice(deviceI);
                d.name().addValueObserver(v -> {
                    rawCache[j].name = v;
                    cacheDirty = true;
                });
                d.exists().addValueObserver(v -> {
                    rawCache[j].exists = v;
                    cacheDirty = true;
                });
                d.isNested().addValueObserver(v -> {
                    rawCache[j].isNested = v;
                    cacheDirty = true;
                });
                d.isExpanded().addValueObserver(v -> {
                    rawCache[j].isExpanded = v;
                    cacheDirty = true;
                });
                d.isRemoteControlsSectionVisible().addValueObserver(v -> {
                    rawCache[j].isRcSectionVisible = v;
                    cacheDirty = true;
                });
                d.isWindowOpen().addValueObserver(v -> {
                    rawCache[j].isWindowOpen = v;
                    cacheDirty = true;
                });
                d.isPlugin().addValueObserver(v -> {
                    rawCache[j].isPlugin = v;
                    cacheDirty = true;
                });
            }
            trackDeviceCaches.add(rawCache);
        }
    }

    private BitwigDevice cacheToDeviceDef(DeviceCache d) {
        BitwigDevice bd = new BitwigDevice();
        bd.id = d.id;
        bd.name = d.name;
        bd.exists = d.exists;
        bd.isNested = d.isNested;
        bd.isSelected = d.isSelected;
        bd.isExpanded = d.isExpanded;
        bd.isRcSectionVisible = d.isRcSectionVisible;
        bd.isWindowOpen = d.isWindowOpen;
        bd.isPlugin = d.isPlugin;
        return bd;
    }

    private DeviceCache[] getDeviceCachesForSelectedTrack() {
        if (this.selectedTrackId == -1)
            return null;
        return this.trackDeviceCaches.get(this.selectedTrackId);
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
        var deviceCachesForSelectedTrack = getDeviceCachesForSelectedTrack();
        if (deviceCachesForSelectedTrack == null)
            return;
        List<BitwigDevice> devices = Arrays.asList(deviceCachesForSelectedTrack)
            .stream()
            .map(d -> this.cacheToDeviceDef(d))
            .toList();
        if (cacheDirty)
            this.bus.send(
                new DevicesSchemaChanged(devices)
            );
    }

    public void on(Event event) {
        switch (event) {
            case BitwigTrackSelected(int id) -> {
                this.selectedTrackId = id;
            }
            default -> { }
        }
    }
}
