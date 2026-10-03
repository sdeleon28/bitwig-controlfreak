package dev.tradcode.groupctl.tones;

import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.tones.events.FootswitchPressed;
import dev.tradcode.groupctl.tones.events.FootswitchReleased;

/** M-VAVE footswitch: switches send note-on on channel 1, A=0 .. D=3; release is velocity 0. */
public class FootswitchInput {
    static final int NOTE_ON = 0x90;

    public FootswitchInput(IEventBus bus, MidiIn in) {
        in.setMidiCallback((int status, int note, int velocity) -> {
            if (status != NOTE_ON)
                return;
            bus.send(velocity > 0 ? new FootswitchPressed(note) : new FootswitchReleased(note));
        });
    }
}
