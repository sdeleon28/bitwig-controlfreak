package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.MidiOut;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;

public class TwisterOutput implements IEventBusSubscriber {
    IEventBus bus;
    MidiOut out;

    public TwisterOutput(IEventBus bus, MidiOut out) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.out = out;
    }

    private void paint(int n, int color) {
        var cc = this.encoderToCC(n);
        this.out.sendMidi(0xB1, cc, color);
        this.out.sendMidi(0xB2, cc, 47);
    }

    private void ring(int n, int value) {
       var cc = this.encoderToCC(n);
       this.out.sendMidi(0xB0, cc, value);
    }

    private void off(int n) {
        var cc = this.encoderToCC(n);
        this.out.sendMidi(0xB2, cc, 17);
    }

    private int encoderToCC(int n) {
        var n0 = n - 1;
        var row = (int) Math.floor(n0 / 4);
        var col = n0 % 4;
        return (3 - row) * 4 + col;
    }

    public void clear() {
        for (int i = 1; i <= 16; i++)
            this.off(i);
    }

    public void on(Event event) {
        switch (event) {
            case PaintEncoder(int n, int color) -> this.paint(n, color);
            case SetEncoderValue(int n, int v) -> this.ring(n, v);
            default -> { }
        }
    }
}

