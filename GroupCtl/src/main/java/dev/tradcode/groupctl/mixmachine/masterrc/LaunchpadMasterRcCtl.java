package dev.tradcode.groupctl.mixmachine.masterrc;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectMaster;

/**
 * Owns the special master-RC pad in the group quadrant (the corner pad reserved
 * out of {@code LaunchpadGroupCtl}). Tapping it merely <em>requests</em> that
 * Bitwig select the master track; the pad's lit state then follows the resulting
 * {@link BitwigTrackSelected}, exactly like a group pad follows track selection.
 */
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

    public void on(Event event) {
        switch (event) {
            case PadClicked(int n) when this.pageActive && n == PAD ->
                this.bus.send(new RequestSelectMaster());
            case BitwigTrackSelected(int id) -> {
                this.selected = id == BitwigMasterRcTracker.MASTER_ID;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == Page.GROUPCTL.getValue();
                this.paint();
            }
            default -> { }
        }
    }
}
