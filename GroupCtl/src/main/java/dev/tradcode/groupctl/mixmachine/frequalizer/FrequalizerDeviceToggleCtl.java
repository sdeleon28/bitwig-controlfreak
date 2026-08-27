package dev.tradcode.groupctl.mixmachine.frequalizer;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerDeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestToggleFrequalizerDevice;

/**
 * The device on/off switch in the corner of the Frequalizer quadrant, mirroring
 * the switch a generic device gets on the same pad. It is the quadrant's own,
 * so the whole layout stays described in this package.
 */
public class FrequalizerDeviceToggleCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean frequalizerModeActive = false;
    boolean pageActive = true;
    boolean enabled = false;

    public FrequalizerDeviceToggleCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isLive() {
        return this.frequalizerModeActive && this.pageActive;
    }

    private void paint() {
        if (!this.isLive())
            return;
        this.bus.send(new PaintPad(
            FrequalizerQuadrant.localToNote(FrequalizerLayout.DEVICE_TOGGLE_PAD),
            this.enabled ? FrequalizerColors.DEVICE_ON : FrequalizerColors.DEVICE_OFF));
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerActivated(boolean a) -> {
                this.frequalizerModeActive = a;
                this.paint();
            }
            case FrequalizerDeviceEnabledChanged(boolean enabled) -> {
                this.enabled = enabled;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == Page.GROUPCTL.getValue();
                this.paint();
            }
            case PadClicked(int n) when this.isLive()
                    && FrequalizerQuadrant.noteToLocal(n) == FrequalizerLayout.DEVICE_TOGGLE_PAD ->
                this.bus.send(new RequestToggleFrequalizerDevice());
            default -> { }
        }
    }
}
