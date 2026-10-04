package dev.tradcode.groupctl.mixmachine.uidevice;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkSideButton;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

/**
 * Owns the Send B side button on the group page. It blinks white while a device
 * is selected in Bitwig's UI (there is something to grab) and lights solid while
 * the device selected in the UI is the grabbed one. Tapping it grabs the UI-selected device onto the surface
 * by emitting the same {@link DeviceGrabbed} the device pads emit — so devices
 * nested in chains, FX layers or multi-output devices, which the pads can't
 * reach, get the exact same treatment: generic RC mode, custom mappers like the
 * Frequalizer, and every twister program yielding.
 */
public class LaunchpadUiDeviceCtl implements IEventBusSubscriber {
    static int WHITE = 3;

    IEventBus bus;
    boolean pageActive = true;
    boolean deviceExists = false;
    String deviceName = null;
    boolean grabbed = false;
    String grabbedName = null;

    public LaunchpadUiDeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive) return;
        if (!this.deviceExists)
            this.bus.send(new PaintSideButton(SideButton.SEND_B, 0));
        else if (this.grabbed)
            this.bus.send(new PaintSideButton(SideButton.SEND_B, WHITE));
        else
            this.bus.send(new BlinkSideButton(SideButton.SEND_B, WHITE));
    }

    public void on(Event event) {
        switch (event) {
            case SideButtonClick(var btn)
            when this.pageActive && btn == SideButton.SEND_B -> {
                if (this.deviceExists && this.deviceName != null)
                    this.bus.send(new DeviceGrabbed(this.deviceName));
            }
            case DeviceGrabbed(String name) -> {
                this.grabbed = true;
                this.grabbedName = name;
                this.paint();
            }
            case CursorDeviceExistsChanged(boolean e) -> {
                this.deviceExists = e;
                this.paint();
            }
            case CursorDeviceNameChanged(String name) -> {
                this.deviceName = name;
                boolean grabbed = this.grabbed && name != null && name.equals(this.grabbedName);
                if (grabbed != this.grabbed) {
                    this.grabbed = grabbed;
                    this.paint();
                }
            }
            case BitwigTrackSelected(int id) -> { this.grabbed = false; this.paint(); }
            case RequestSelectTrack(int id, String name) -> { this.grabbed = false; this.paint(); }
            case RequestFxSelectTrack(int id, String name) -> { this.grabbed = false; this.paint(); }
            case PageSelected(int n) -> {
                this.pageActive = n == Page.GROUPCTL.getValue();
                this.paint();
            }
            default -> { }
        }
    }
}
