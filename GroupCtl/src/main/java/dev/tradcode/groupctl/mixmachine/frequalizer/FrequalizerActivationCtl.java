package dev.tradcode.groupctl.mixmachine.frequalizer;

import dev.tradcode.groupctl.events.DeviceSelected;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;

/**
 * Decides when the feature is active. 
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
            case DeviceSelected(String name) ->
                this.setActive(FrequalizerConstants.DEVICE_NAME.equals(name));
            case RequestSelectTrack(int id, String name) -> this.setActive(false);
            case BitwigTrackSelected(int id) -> this.setActive(false);
            default -> { }
        }
    }
}
