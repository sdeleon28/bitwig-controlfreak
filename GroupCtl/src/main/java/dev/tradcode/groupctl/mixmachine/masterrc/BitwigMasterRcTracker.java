package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.MasterTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.PinnedRcPage;
import dev.tradcode.groupctl.mixmachine.TwisterRcGeometry;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectMaster;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcNameChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

public class BitwigMasterRcTracker implements IEventBusSubscriber {
    // The master track lives outside the numbered track bank, so it gets a
    // sentinel id that can never collide with a real bank index. Selecting it is
    // published as an ordinary BitwigTrackSelected so the rest of the system
    // treats it like any other selection.
    public static final int MASTER_ID = Integer.MIN_VALUE;

    IEventBus bus;
    MasterTrack master;
    PinnedRcPage[] pages = new PinnedRcPage[TwisterRcGeometry.PAGE_COUNT];
    boolean selected = false;

    public BitwigMasterRcTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.master = host.createMasterTrack(0);
        this.master.addIsSelectedInMixerObserver(v -> {
            this.selected = v;
            if (v) this.bus.send(new BitwigTrackSelected(MASTER_ID));
        });
        for (int page = 0; page < TwisterRcGeometry.PAGE_COUNT; page++) {
            final int pageIndex = page;
            final PinnedRcPage pinned = new PinnedRcPage(
                this.master.createCursorRemoteControlsPage(
                    "groupctl-masterrc-page-" + page, TwisterRcGeometry.RC_PER_PAGE, ""),
                page, host);
            this.pages[page] = pinned;
            for (int param = 0; param < TwisterRcGeometry.RC_PER_PAGE; param++) {
                final int slot = TwisterRcGeometry.slotFor(page, param);
                var rc = pinned.parameter(param);
                rc.value().addValueObserver(v -> this.publishValue(pinned, slot, v));
                rc.exists().addValueObserver(e -> this.publishExists(pinned, slot, e));
                rc.name().addValueObserver(
                    name -> this.bus.send(new MasterRcNameChanged(slot, name))
                );
            }
            pinned.addPresenceObserver(() -> this.republish(pinned, pageIndex));
        }
    }

    private void publishValue(PinnedRcPage pinned, int slot, double v) {
        this.bus.send(new MasterRcValueChanged(slot, pinned.isPresent() ? v : 0.0));
    }

    private void publishExists(PinnedRcPage pinned, int slot, boolean e) {
        this.bus.send(new MasterRcExistsChanged(slot, pinned.isPresent() && e));
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
            case RequestSelectMaster() -> {
                this.master.selectInMixer();
                this.master.makeVisibleInMixer();
                if (this.selected) {
                    // already the Bitwig selection, so the observer won't fire
                    // again; re-announce so a re-tap reclaims the encoders (e.g.
                    // from device RC)
                    this.bus.send(new BitwigTrackSelected(MASTER_ID));
                }
            }
            case SetMasterRcValue(int slot, double v) ->
                this.pages[TwisterRcGeometry.pageForSlot(slot)]
                    .parameter(TwisterRcGeometry.paramForSlot(slot)).value().set(v);
            default -> { }
        }
    }
}
