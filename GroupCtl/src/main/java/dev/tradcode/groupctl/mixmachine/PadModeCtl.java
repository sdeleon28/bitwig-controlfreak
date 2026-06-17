package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.PadMode;
import dev.tradcode.groupctl.events.PadModeUpdated;

public class PadModeCtl implements IEventBusSubscriber {
    IEventBus bus;
    PadMode mode = PadMode.SELECT;
    boolean pageActive = true;

    public PadModeCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.paint();
    }

    public void clear() {
        if (!this.pageActive) return;
        this.bus.send(new PaintSideButton(SideButton.SEND_B, 0));
        this.bus.send(new PaintSideButton(SideButton.STOP, 0));
        this.bus.send(new PaintSideButton(SideButton.MUTE, 0));
        this.bus.send(new PaintSideButton(SideButton.SOLO, 0));
        this.bus.send(new PaintSideButton(SideButton.RECORD_ARM, 0));
    }

    public void paint() {
        if (!this.pageActive) return;
        this.clear();
        switch (this.mode) {
            case PadMode.SELECT:
                this.bus.send(new PaintSideButton(SideButton.STOP, MixMachineColors.SELECT_COLOR));
                break;
            case PadMode.MUTE:
                this.bus.send(new PaintSideButton(SideButton.MUTE, MixMachineColors.MUTE_COLOR));
                break;
            case PadMode.SOLO:
                this.bus.send(new PaintSideButton(SideButton.SOLO, MixMachineColors.SOLO_COLOR));
                break;
            case PadMode.REC:
                this.bus.send(new PaintSideButton(SideButton.RECORD_ARM, MixMachineColors.REC_COLOR));
                break;
        }
    }

    private void setMode(PadMode mode) {
        this.mode = mode;
        this.bus.send(new PadModeUpdated(this.mode));
    }

    public void on(Event event) {
        switch (event) {
            case SideButtonClick(var btn) when this.pageActive -> {
                switch (btn) {
                    case SideButton.STOP:
                        this.setMode(PadMode.SELECT);
                        this.paint();
                        break;
                    case SideButton.MUTE:
                        this.setMode(PadMode.MUTE);
                        this.paint();
                        break;
                    case SideButton.SOLO:
                        this.setMode(PadMode.SOLO);
                        this.paint();
                        break;
                    case SideButton.RECORD_ARM:
                        this.setMode(PadMode.REC);
                        this.paint();
                        break;
                    default:
                        break;
                }
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            default -> { }
        }
    }
}
