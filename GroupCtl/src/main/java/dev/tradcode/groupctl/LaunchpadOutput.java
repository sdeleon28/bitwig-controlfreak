package dev.tradcode.groupctl;

import java.util.Arrays;
import java.util.List;

import com.bitwig.extension.controller.api.MidiOut;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.BlinkTopButton;
import dev.tradcode.groupctl.events.ClearLaunchpad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.TopButton;

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

    static int CH_STATIC = 0x90;
    static int CH_FLASH = 0x91;
    static int CH_PULSE = 0x92;
    static int CC_BYTE = 0xB0;
    static int CC_FLASH = 0xB1;

    public LaunchpadOutput(IEventBus bus, MidiOut out) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.out = out;
    }

    public void on(Event event) {
        switch (event) {
            case ClearLaunchpad() -> this.clear();
            case PaintPad(int n, int color) -> this.paintPad(n, color);
            case BlinkPad(int n, int color) -> this.blinkPad(n, color);
            case PaintTopButton(TopButton btn, int color) -> {
                this.paintTopButton(btn.getValue(), color);
            }
            case BlinkTopButton(TopButton btn, int color) -> {
                this.blinkTopButton(btn.getValue(), color);
            }
            case PaintSideButton(SideButton btn, int color) -> {
                this.paintSideButton(btn.getValue(), color);
            }
            default -> { }
        }
    }

    public void paintPad(int n, int color) {
        assert PADS.contains(n);
        out.sendMidi(CH_STATIC, n, color);
    }

    public void blinkPad(int n, int color) {
        out.sendMidi(CH_STATIC, n, 0);
        out.sendMidi(CH_FLASH, n, color);
    }

    public void paintTopButton(int cc, int color) {
        out.sendMidi(CC_BYTE, cc, color);
    }

    public void blinkTopButton(int cc, int color) {
        out.sendMidi(CC_BYTE, cc, 0);
        out.sendMidi(CC_FLASH, cc, color);
    }

    public void paintSideButton(int n, int color) {
        this.paintPad(n, color);
    }

    public void clear() {
        for (int n : PADS)
            this.paintPad(n, 0);
        for (SideButton b : SideButton.values())
            this.paintSideButton(b.getValue(), 0);
        for (TopButton b : TopButton.values())
            this.paintTopButton(b.getValue(), 0);
    }
}
