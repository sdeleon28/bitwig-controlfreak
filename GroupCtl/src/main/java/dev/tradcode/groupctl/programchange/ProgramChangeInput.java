package dev.tradcode.groupctl.programchange;

import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.programchange.events.ProgramChangeReceived;

public class ProgramChangeInput {
    static final int PROGRAM_CHANGE = 0xC0;

    public ProgramChangeInput(IEventBus bus, MidiIn in) {
        in.setMidiCallback((int status, int program, int unused) -> {
            if ((status & 0xF0) != PROGRAM_CHANGE)
                return;
            bus.send(new ProgramChangeReceived(program));
        });
    }
}
