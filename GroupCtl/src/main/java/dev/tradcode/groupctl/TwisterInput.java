package dev.tradcode.groupctl;

import java.util.List;

import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.IEventBus;

public class TwisterInput {
    IEventBus bus;
    MidiIn in;
    int ENCODER_CHANNEL_BYTE = 176;
    int BUTTON_CHANNEL_BYTE = 177;

    public TwisterInput(IEventBus bus, MidiIn in) {
        this.bus = bus;
        this.in = in;
        this.in.setMidiCallback((int ch, int msg, int vel) -> {
            int n = this.hwToHumanIndex(msg);
            if (ch == ENCODER_CHANNEL_BYTE)
                this.bus.send(new EncoderTurned(
                    n,
                    (float) vel / 127.0f
                ));
            else if (ch == BUTTON_CHANNEL_BYTE)
                this.bus.send(
                    vel == 0 ?
                          new EncoderButtonReleased(n)
                        : new EncoderButtonPressed(n)
                );
        });
    }

    public int hwToHumanIndex(int idx) {
        List<Integer> indices = List.of(
            12, 13, 14, 15,
             8,  9, 10, 11,
             4,  5,  6,  7,
             0,  1,  2,  3
        );
        assert idx > 0;
        assert idx <= indices.size();
        return indices.get(idx) + 1;
    }
}
