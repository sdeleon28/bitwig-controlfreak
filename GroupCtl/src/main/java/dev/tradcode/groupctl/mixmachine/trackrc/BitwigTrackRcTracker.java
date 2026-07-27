package dev.tradcode.groupctl.mixmachine.trackrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.PinnedRcPage;
import dev.tradcode.groupctl.mixmachine.TwisterRcGeometry;
import dev.tradcode.groupctl.mixmachine.trackrc.events.SetTrackRcValue;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcNameChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcValueChanged;

public class BitwigTrackRcTracker implements IEventBusSubscriber {
    IEventBus bus;
    CursorTrack cursorTrack;
    PinnedRcPage[] pages = new PinnedRcPage[TwisterRcGeometry.PAGE_COUNT];

    public BitwigTrackRcTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.cursorTrack = host.createCursorTrack(
            "groupctl-trackrc-cursor", "Track RC Cursor", 0, 0, true);
        for (int page = 0; page < TwisterRcGeometry.PAGE_COUNT; page++) {
            final int pageIndex = page;
            final PinnedRcPage pinned = new PinnedRcPage(
                this.cursorTrack.createCursorRemoteControlsPage(
                    "groupctl-trackrc-page-" + page, TwisterRcGeometry.RC_PER_PAGE, ""),
                page, host);
            this.pages[page] = pinned;
            for (int param = 0; param < TwisterRcGeometry.RC_PER_PAGE; param++) {
                final int slot = TwisterRcGeometry.slotFor(page, param);
                var rc = pinned.parameter(param);
                rc.value().addValueObserver(v -> this.publishValue(pinned, slot, v));
                rc.exists().addValueObserver(e -> this.publishExists(pinned, slot, e));
                rc.name().addValueObserver(
                    name -> this.bus.send(new TrackRcNameChanged(slot, name))
                );
            }
            pinned.addPresenceObserver(() -> this.republish(pinned, pageIndex));
        }
    }

    private void publishValue(PinnedRcPage pinned, int slot, double v) {
        this.bus.send(new TrackRcValueChanged(slot, pinned.isPresent() ? v : 0.0));
    }

    private void publishExists(PinnedRcPage pinned, int slot, boolean e) {
        this.bus.send(new TrackRcExistsChanged(slot, pinned.isPresent() && e));
    }

    private void republish(PinnedRcPage pinned, int page) {
        for (int param = 0; param < TwisterRcGeometry.RC_PER_PAGE; param++) {
            int slot = TwisterRcGeometry.slotFor(page, param);
            var rc = pinned.parameter(param);
            this.publishValue(pinned, slot, rc.value().get());
            this.publishExists(pinned, slot, rc.exists().get());
        }
    }

    public void on(Event event) {
        switch (event) {
            case SetTrackRcValue(int slot, double v) ->
                this.pages[TwisterRcGeometry.pageForSlot(slot)]
                    .parameter(TwisterRcGeometry.paramForSlot(slot)).value().set(v);
            default -> { }
        }
    }
}
