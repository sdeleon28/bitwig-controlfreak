package dev.tradcode.groupctl.mixmachine.masterrc;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;

public class LaunchpadMasterRcCtl implements IEventBusSubscriber {
    static int PAD = 48;
    static int WHITE = 3;

    IEventBus bus;
    boolean pageActive = true;
    boolean selected = false;

    public LaunchpadMasterRcCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive) return;
        this.bus.send(
            this.selected ? new BlinkPad(PAD, WHITE) : new PaintPad(PAD, WHITE)
        );
    }

    private void deselect() {
        if (!this.selected) return;
        this.selected = false;
        this.paint();
    }

    public void on(Event event) {
        switch (event) {
            case PadClicked(int n) when this.pageActive && n == PAD -> {
                this.selected = true;
                this.bus.send(new MasterRcSelected());
                this.paint();
            }
            case BitwigTrackSelected(int n) -> this.deselect();
            case RequestSelectTrack(int id, String name) -> this.deselect();
            case RequestFxSelectTrack(int id, String name) -> this.deselect();
            case RequestSelectDevice(int n) -> this.deselect();
            case PageSelected(int n) -> {
                this.pageActive = n == Page.GROUPCTL.getValue();
                this.paint();
            }
            default -> { }
        }
    }
}
