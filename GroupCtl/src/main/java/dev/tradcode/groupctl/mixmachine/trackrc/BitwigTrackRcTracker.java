package dev.tradcode.groupctl.mixmachine.trackrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.CursorTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.trackrc.events.SetTrackRcValue;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcNameChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcValueChanged;

public class BitwigTrackRcTracker implements IEventBusSubscriber {
    static int RC_COUNT = 8;

    IEventBus bus;
    CursorTrack cursorTrack;
    CursorRemoteControlsPage rcPage;

    public BitwigTrackRcTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.cursorTrack = host.createCursorTrack(
            "groupctl-trackrc-cursor", "Track RC Cursor", 0, 0, true);
        this.rcPage = this.cursorTrack.createCursorRemoteControlsPage(RC_COUNT);
        this.rcPage.selectedPageIndex().set(0);
        for (int i = 0; i < RC_COUNT; i++) {
            final int j = i;
            var rc = this.rcPage.getParameter(i);
            rc.value().addValueObserver(
                v -> this.bus.send(new TrackRcValueChanged(j, v))
            );
            rc.exists().addValueObserver(
                e -> this.bus.send(new TrackRcExistsChanged(j, e))
            );
            rc.name().addValueObserver(
                name -> this.bus.send(new TrackRcNameChanged(j, name))
            );
        }
    }

    public void on(Event event) {
        switch (event) {
            case SetTrackRcValue(int id, double v) ->
                this.rcPage.getParameter(id).value().set(v);
            default -> { }
        }
    }
}
