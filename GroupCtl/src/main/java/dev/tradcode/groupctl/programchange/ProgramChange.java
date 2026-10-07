package dev.tradcode.groupctl.programchange;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/** Program change N plays the Nth {@code { }} song of the setlist; program change 0 stops. */
public class ProgramChange {
    static final int MIDI_IN_PORT = 3;

    public ProgramChange(IEventBus bus, ControllerHost host) {
        new ProgramChangeInput(bus, host.getMidiInPort(MIDI_IN_PORT));
        new SongLauncher(bus);
        new BitwigSongPlaybackTracker(bus, host);
    }
}
