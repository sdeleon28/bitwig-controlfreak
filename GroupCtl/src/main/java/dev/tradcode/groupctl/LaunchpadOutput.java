package dev.tradcode.groupctl;

import java.util.Arrays;
import java.util.List;

import com.bitwig.extension.controller.api.MidiOut;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintPad;

public class LaunchpadOutput implements IEventBusSubscriber {
    IEventBus bus;
    MidiOut out;
    static List<Integer> PADS = Arrays.asList(
        11, 12, 13, 14, 15, 16, 17, 18,
        21, 22, 23, 24, 25, 26, 27, 28,
        31, 32, 33, 34, 35, 36, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48,
        51, 52, 53, 54, 55, 56, 57, 58,
        61, 62, 63, 64, 65, 66, 67, 68,
        71, 72, 73, 74, 75, 76, 77, 78,
        81, 82, 83, 84, 85, 86, 87, 88
    );

    public LaunchpadOutput(IEventBus bus, MidiOut out) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.out = out;
    }

    public void on(Event event) {
        if (event instanceof PaintPad) {
            PaintPad e = (PaintPad) event;
            this.paintPad(e.n, e.color);
        }
    }

    public void paintPad(int n, int color) {
        assert PADS.contains(n);
        out.sendMidi(0x90, n, color);
    }

    public void clear() {
        for (int i = 1; i <= 64; i++)
            this.paintPad(i, 0);
    }
}
