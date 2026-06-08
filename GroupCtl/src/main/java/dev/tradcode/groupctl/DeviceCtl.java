package dev.tradcode.groupctl;

import java.util.List;

import dev.tradcode.groupctl.events.BitwigDevice;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public abstract class DeviceCtl implements IEventBusSubscriber {
    IEventBus bus;
    List<BitwigDevice> devices;
    int selectedDeviceId = -1;

    public DeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    protected abstract void paint();

    public void on(Event event) {
        switch (event) {
            case BitwigTrackSelected(int n) -> this.selectedDeviceId = -1;
            case DevicesSchemaChanged(List<BitwigDevice> devices) -> {
                this.devices = devices;
                this.paint();
            }
            default -> { }
        }
    }
}
