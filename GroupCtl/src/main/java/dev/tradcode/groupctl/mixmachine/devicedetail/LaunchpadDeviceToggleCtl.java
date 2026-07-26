package dev.tradcode.groupctl.mixmachine.devicedetail;

import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.DeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.RequestToggleDevice;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

/**
 * Owns the top-right corner pad in device mode. Entering device mode frees the
 * top-right quadrant; for a generic device that pad becomes the device's on/off
 * switch — gold when enabled, dark when disabled. Devices with a dedicated
 * controller paint the quadrant themselves, so the pad stays out of their way
 * by name.
 */
public class LaunchpadDeviceToggleCtl implements IEventBusSubscriber {
    static int PAD = 88;
    static int GOLD = 99;
    static int OFF = 0;

    static final Set<String> CUSTOM_MAPPED_DEVICES = Set.of("Frequalizer Alt");

    IEventBus bus;
    boolean pageActive = true;
    boolean active = false;
    boolean enabled = false;

    public LaunchpadDeviceToggleCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isCustomMapped(String name) {
        return name != null && CUSTOM_MAPPED_DEVICES.contains(name);
    }

    private void paint() {
        if (!this.pageActive) return;
        if (!this.active) {
            this.bus.send(new PaintPad(PAD, OFF));
            return;
        }
        this.bus.send(new PaintPad(PAD, this.enabled ? GOLD : OFF));
    }

    public void on(Event event) {
        switch (event) {
            case DeviceGrabbed(String name) -> {
                this.active = !this.isCustomMapped(name);
                this.paint();
            }
            case DeviceEnabledChanged(boolean enabled) -> {
                this.enabled = enabled;
                this.paint();
            }
            case BitwigTrackSelected(int id) -> {
                this.active = false;
                this.paint();
            }
            case RequestSelectTrack(int id, String name) -> {
                this.active = false;
                this.paint();
            }
            case RequestFxSelectTrack(int id, String name) -> {
                this.active = false;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == Page.GROUPCTL.getValue();
                this.paint();
            }
            case PadClicked(int n) when this.pageActive && this.active && n == PAD ->
                this.bus.send(new RequestToggleDevice());
            default -> { }
        }
    }
}
