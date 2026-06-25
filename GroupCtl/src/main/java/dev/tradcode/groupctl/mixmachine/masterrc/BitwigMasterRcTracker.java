package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.MasterTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

public class BitwigMasterRcTracker implements IEventBusSubscriber {
    static int RC_COUNT = 8;

    IEventBus bus;
    MasterTrack master;
    CursorRemoteControlsPage rcPage;

    public BitwigMasterRcTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.master = host.createMasterTrack(0);
        this.rcPage = this.master.createCursorRemoteControlsPage(RC_COUNT);
        this.rcPage.selectedPageIndex().set(0);
        for (int i = 0; i < RC_COUNT; i++) {
            final int j = i;
            this.rcPage.getParameter(i).value().addValueObserver(
                v -> this.bus.send(new MasterRcValueChanged(j, v))
            );
        }
    }

    public void on(Event event) {
        switch (event) {
            case MasterRcSelected() -> {
                this.rcPage.selectedPageIndex().set(0);
                this.master.selectInMixer();
                this.master.makeVisibleInMixer();
            }
            case SetMasterRcValue(int id, double v) ->
                this.rcPage.getParameter(id).value().set(v);
            default -> { }
        }
    }
}
