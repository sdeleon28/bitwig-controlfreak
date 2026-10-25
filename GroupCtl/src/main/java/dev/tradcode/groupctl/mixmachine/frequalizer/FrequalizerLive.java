package dev.tradcode.groupctl.mixmachine.frequalizer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/** {@link Frequalizer} without the Launchpad quadrant: the mode is whatever the plugin is set to. */
public class FrequalizerLive {
    BitwigFrequalizerTracker tracker;

    public FrequalizerLive(IEventBus bus, ControllerHost host) {
        new FrequalizerActivationCtl(bus);
        new FrequalizerCalculator(bus);
        new FrequalizerTwisterPainter(bus);
        new FrequalizerTwisterInputCtl(bus);
        this.tracker = new BitwigFrequalizerTracker(bus, host);
    }

    public void flush() {
        this.tracker.flush();
    }
}
