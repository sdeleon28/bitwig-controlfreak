package dev.tradcode.groupctl.mixmachine.frequalizer;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModePadsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ModePadSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

public class FrequalizerModeCtl implements IEventBusSubscriber {
    static final int QUADRANT_SIDE = 4;

    IEventBus bus;
    boolean active = false;

    public FrequalizerModeCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private int localToNote(int localPad) {
        int local0 = localPad - 1;
        int row = local0 / QUADRANT_SIDE;
        int col = local0 % QUADRANT_SIDE;
        return FrequalizerConstants.QUADRANT_ORIGIN + row * 10 + col;
    }

    private int noteToLocal(int note) {
        int row = note / 10 - FrequalizerConstants.QUADRANT_ORIGIN / 10;
        int col = note % 10 - FrequalizerConstants.QUADRANT_ORIGIN % 10;
        if (row < 0 || row >= QUADRANT_SIDE || col < 0 || col >= QUADRANT_SIDE)
            return -1;
        return row * QUADRANT_SIDE + col + 1;
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerActivated(boolean a) -> this.active = a;
            case FrequalizerModePadsChanged(var pads) -> {
                for (ModePadSlot pad : pads)
                    this.bus.send(new PaintPad(localToNote(pad.localPad()), pad.color()));
            }
            case PadClicked(int n) when this.active -> {
                Integer modeValue = FrequalizerLayout.modeValueForPad(noteToLocal(n));
                if (modeValue != null)
                    this.bus.send(new RequestSetFrequalizerParam(
                        FrequalizerParams.MODE, modeValue, FrequalizerConstants.MODE_RANGE));
            }
            default -> { }
        }
    }
}
