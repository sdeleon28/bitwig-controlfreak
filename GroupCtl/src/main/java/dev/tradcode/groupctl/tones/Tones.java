package dev.tradcode.groupctl.tones;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/** M-VAVE footswitch A..F picks one of the tone tracks "A (n)" .. "F (n)". */
public class Tones {
    public Tones(IEventBus bus, ControllerHost host) {
        new FootswitchInput(bus, host.getMidiInPort(2));
        new ToneSelector(bus);
        new BitwigTonesTracker(bus, host);
        new ToneGrowler(bus, host);
        new ToneFocusCtl(bus);
    }
}
