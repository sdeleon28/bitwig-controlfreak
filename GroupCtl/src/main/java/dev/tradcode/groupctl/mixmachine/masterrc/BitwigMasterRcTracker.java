package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.MasterTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectMaster;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

public class BitwigMasterRcTracker implements IEventBusSubscriber {
    static int RC_COUNT = 8;

    // The master track lives outside the numbered track bank, so it gets a
    // sentinel id that can never collide with a real bank index. Selecting it is
    // published as an ordinary BitwigTrackSelected so the rest of the system
    // treats it like any other selection.
    public static final int MASTER_ID = Integer.MIN_VALUE;

    IEventBus bus;
    MasterTrack master;
    CursorRemoteControlsPage rcPage;
    boolean selected = false;

    public BitwigMasterRcTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.master = host.createMasterTrack(0);
        this.master.addIsSelectedInMixerObserver(v -> {
            this.selected = v;
            if (v) this.bus.send(new BitwigTrackSelected(MASTER_ID));
        });
        this.rcPage = this.master.createCursorRemoteControlsPage(RC_COUNT);
        this.rcPage.selectedPageIndex().set(0);
        for (int i = 0; i < RC_COUNT; i++) {
            final int j = i;
            var rc = this.rcPage.getParameter(i);
            rc.value().addValueObserver(
                v -> this.bus.send(new MasterRcValueChanged(j, v))
            );
            rc.exists().addValueObserver(
                e -> this.bus.send(new MasterRcExistsChanged(j, e))
            );
        }
    }

    public void on(Event event) {
        switch (event) {
            case RequestSelectMaster() -> {
                this.rcPage.selectedPageIndex().set(0);
                this.master.selectInMixer();
                this.master.makeVisibleInMixer();
                if (this.selected) {
                    // already the Bitwig selection, so the observer won't fire
                    // again; re-announce so a re-tap reclaims the encoders (e.g.
                    // from device RC)
                    this.bus.send(new BitwigTrackSelected(MASTER_ID));
                }
            }
            case SetMasterRcValue(int id, double v) ->
                this.rcPage.getParameter(id).value().set(v);
            default -> { }
        }
    }
}
