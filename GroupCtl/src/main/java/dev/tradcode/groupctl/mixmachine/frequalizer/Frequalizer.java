package dev.tradcode.groupctl.mixmachine.frequalizer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class Frequalizer {
    BitwigFrequalizerTracker tracker;

    public Frequalizer(IEventBus bus, ControllerHost host) {
        // Calculation
        new FrequalizerCalculator(bus);

        // Painting
        new FrequalizerTwisterPainter(bus);
        new FrequalizerModeCtl(bus);

        // Input controllers
        new FrequalizerTwisterInputCtl(bus);

        // Bitwig tracker
        this.tracker = new BitwigFrequalizerTracker(bus, host);
    }

    public void flush() {
        this.tracker.flush();
    }
}
