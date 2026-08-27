package dev.tradcode.groupctl.mixmachine.frequalizer;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerGrabbed;

/**
 * Decides when the feature is active, and which plugin instance it runs on: a
 * grab is the only thing that points the feature at a device, so every grab is
 * announced even when the feature is already active.
 */
public class FrequalizerActivationCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean active = false;

    public FrequalizerActivationCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void setActive(boolean a) {
        if (a == this.active)
            return;
        this.active = a;
        this.bus.send(new FrequalizerActivated(a));
    }

    public void on(Event event) {
        switch (event) {
            case DeviceGrabbed(String name) -> {
                if (!FrequalizerConstants.DEVICE_NAME.equals(name)) {
                    this.setActive(false);
                    return;
                }
                this.bus.send(new FrequalizerGrabbed());
                this.setActive(true);
            }
            case RequestSelectTrack(int id, String name) -> this.setActive(false);
            case BitwigTrackSelected(int id) -> this.setActive(false);
            default -> { }
        }
    }
}
