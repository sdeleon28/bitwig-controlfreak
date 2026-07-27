package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigDevice;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.RcExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestInitRcs;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import java.util.ArrayList;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.CursorTrack;
import com.bitwig.extension.controller.api.DeviceBank;

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
    static int DEVICE_COUNT = 16;

    IEventBus bus;
    DeviceCache[] rawCache = new DeviceCache[DEVICE_COUNT];
    boolean cacheDirty = false;
    int selectedTrackId;
    CursorTrack cursorTrack;
    CursorDevice cursorDevice;
    DeviceBank cursorDeviceBank;
    PinnedRcPage[] pages = new PinnedRcPage[TwisterRcGeometry.PAGE_COUNT];

    public BitwigDevicesTracker(
        IEventBus bus,
        ControllerHost host
    ) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.cursorTrack = host.createCursorTrack(
            "groupctl-device-cursor", "Device Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();
        this.cursorDevice.exists().addValueObserver(
            e -> this.bus.send(new CursorDeviceExistsChanged(e))
        );
        this.cursorDevice.name().addValueObserver(
            name -> this.bus.send(new CursorDeviceNameChanged(name))
        );
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
        for (int page = 0; page < TwisterRcGeometry.PAGE_COUNT; page++) {
            final int pageIndex = page;
            final PinnedRcPage pinned = new PinnedRcPage(
                this.cursorDevice.createCursorRemoteControlsPage(
                    "groupctl-device-page-" + page, TwisterRcGeometry.RC_PER_PAGE, ""),
                page, host);
            this.pages[page] = pinned;
            for (int param = 0; param < TwisterRcGeometry.RC_PER_PAGE; param++) {
                final int slot = TwisterRcGeometry.slotFor(page, param);
                var rc = pinned.parameter(param);
                rc.value().addValueObserver(v -> this.publishValue(pinned, slot, v));
                rc.exists().addValueObserver(e -> this.publishExists(pinned, slot, e));
            }
            pinned.addPresenceObserver(() -> this.republish(pinned, pageIndex));
        }
    }

    private void publishValue(PinnedRcPage pinned, int slot, double v) {
        this.bus.send(new RcValueChanged(slot, pinned.isPresent() ? v : 0.0));
    }

    private void publishExists(PinnedRcPage pinned, int slot, boolean e) {
        this.bus.send(new RcExistsChanged(slot, pinned.isPresent() && e));
    }

    private void republish(PinnedRcPage pinned, int page) {
        for (int param = 0; param < TwisterRcGeometry.RC_PER_PAGE; param++) {
            int slot = TwisterRcGeometry.slotFor(page, param);
            var rc = pinned.parameter(param);
            this.publishValue(pinned, slot, rc.value().get());
            this.publishExists(pinned, slot, rc.exists().get());
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
            case RequestInitRcs() -> {
                for (int page = 0; page < TwisterRcGeometry.PAGE_COUNT; page++)
                    this.republish(this.pages[page], page);
            }
            case SetRcValue(int slot, double v) ->
                this.pages[TwisterRcGeometry.pageForSlot(slot)]
                    .parameter(TwisterRcGeometry.paramForSlot(slot)).value().set(v);
            default -> { }
        }
    }
}
