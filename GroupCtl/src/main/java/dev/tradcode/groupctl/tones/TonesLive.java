package dev.tradcode.groupctl.tones;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/** {@link Tones} without the footswitch: only the Twister's tuner toggle. */
public class TonesLive {
    public TonesLive(IEventBus bus, ControllerHost host) {
        new BitwigTonesTracker(bus, host);
        new ToneGrowler(bus, host);
        new TwisterTunerCtl(bus);
    }
}
