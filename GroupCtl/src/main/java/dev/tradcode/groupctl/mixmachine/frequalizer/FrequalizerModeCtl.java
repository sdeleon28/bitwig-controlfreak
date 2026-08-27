package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModePadsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ModePadSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

public class FrequalizerModeCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean frequalizerModeActive = false;
    boolean pageActive = true;
    List<ModePadSlot> pads = new ArrayList<>();

    public FrequalizerModeCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isLive() {
        return this.frequalizerModeActive && this.pageActive;
    }

    private void paint() {
        if (!this.pageActive)
            return;
        for (ModePadSlot pad : this.pads)
            this.bus.send(new PaintPad(FrequalizerQuadrant.localToNote(pad.localPad()), pad.color()));
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerActivated(boolean a) -> this.frequalizerModeActive = a;
            case FrequalizerModePadsChanged(var pads) -> {
                this.pads = pads;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                if (this.isLive())
                    this.paint();
            }
            case PadClicked(int n) when this.isLive() -> {
                Integer modeValue = FrequalizerLayout.modeValueForPad(FrequalizerQuadrant.noteToLocal(n));
                if (modeValue != null)
                    this.bus.send(new RequestSetFrequalizerParam(
                        FrequalizerParams.MODE, modeValue, FrequalizerConstants.MODE_RANGE));
            }
            default -> { }
        }
    }
}
