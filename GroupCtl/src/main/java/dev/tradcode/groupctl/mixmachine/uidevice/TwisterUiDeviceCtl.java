package dev.tradcode.groupctl.mixmachine.uidevice;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonChord;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

/**
 * The Launchpad-free twin of {@link LaunchpadUiDeviceCtl}'s Send B: holding the
 * Twister's two bottom side buttons together grabs the device selected in
 * Bitwig's UI.
 */
public class TwisterUiDeviceCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean deviceExists = false;
    String deviceName = null;

    public TwisterUiDeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case TwisterSideButtonChord chord
            when chord.is(TwisterSideButton.BOTTOM_LEFT, TwisterSideButton.BOTTOM_RIGHT)
              && this.deviceExists && this.deviceName != null ->
                this.bus.send(new DeviceGrabbed(this.deviceName));
            case CursorDeviceExistsChanged(boolean e) -> this.deviceExists = e;
            case CursorDeviceNameChanged(String name) -> this.deviceName = name;
            default -> { }
        }
    }
}
