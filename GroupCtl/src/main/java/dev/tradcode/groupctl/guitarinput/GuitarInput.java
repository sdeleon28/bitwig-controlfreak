package dev.tradcode.groupctl.guitarinput;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * The Twister's top-left side button arms and monitors every track under the
 * guitars group. The API cannot route a track's audio input, so the tracks
 * are expected to already listen to the interface's guitar input.
 */
public class GuitarInput {
    public GuitarInput(IEventBus bus, ControllerHost host) {
        new GuitarInputCtl(bus);
        new BitwigGuitarInputTracker(bus, host);
        new GuitarInputGrowler(bus, host);
    }
}
