package dev.tradcode.groupctl.programchange;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.IEventBus;

/** Program change N plays the Nth {@code { }} song of the setlist; program change 0 stops. */
public class ProgramChange {
    public ProgramChange(IEventBus bus, ControllerHost host, MidiIn in) {
        new ProgramChangeInput(bus, in);
        new SongLauncher(bus);
        new BitwigSongPlaybackTracker(bus, host);
    }
}
