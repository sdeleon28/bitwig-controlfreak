package dev.tradcode.groupctl.tones;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigDevice;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;

/**
 * Focuses mixmachine on the selected tone the way the Launchpad would: tap its
 * group, then its track pad, then grab the amp so its RCs land on the Twister.
 *
 * The device list of the newly selected track may never be re-published when
 * every tone shares the same chain, so the amp is grabbed from the last known
 * list right away and again whenever a fresh list shows it somewhere else.
 * Once anything else is grabbed, the tone lets go of the surface.
 */
public class ToneFocusCtl implements IEventBusSubscriber {
    static final String AMP = "Archetype Gojira X";

    IEventBus bus;
    List<BitwigTrack> schema = new ArrayList<>();
    List<BitwigDevice> devices = new ArrayList<>();
    int lastSelectedId = -1;
    BitwigTrack pendingGroup;
    BitwigTrack pendingTrack;
    int focusedTrackId = -1;
    int grabbedAmpId = -1;

    public ToneFocusCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case SchemaChanged(ArrayList<BitwigTrack> schema) -> this.schema = schema;
            case RequestSelectTone(char tone) -> this.focus(tone);
            case BitwigTrackSelected(int id) -> this.trackSelected(id);
            case DeviceGrabbed(String name) -> {
                if (!AMP.equals(name))
                    this.focusedTrackId = -1;
            }
            case DevicesSchemaChanged(List<BitwigDevice> devices) -> {
                this.devices = devices;
                if (this.focusedTrackId != -1)
                    this.grabAmp();
            }
            default -> { }
        }
    }

    private void focus(char tone) {
        this.focusedTrackId = -1;
        this.grabbedAmpId = -1;
        this.pendingGroup = null;
        this.pendingTrack = null;
        for (var group : this.schema)
            if (this.findTone(group, tone))
                break;
        if (this.pendingTrack == null)
            return;
        if (this.lastSelectedId == this.pendingGroup.id)
            this.selectPendingTrack();
        else
            this.bus.send(new RequestSelectTrack(this.pendingGroup.id, this.pendingGroup.name));
    }

    private boolean findTone(BitwigTrack group, char tone) {
        for (var child : group.children) {
            var m = BitwigTonesTracker.TONE_TRACK.matcher(child.name);
            if (m.matches() && m.group(1).charAt(0) == tone) {
                this.pendingGroup = group;
                this.pendingTrack = child;
                return true;
            }
            if (this.findTone(child, tone))
                return true;
        }
        return false;
    }

    private void trackSelected(int id) {
        this.lastSelectedId = id;
        if (this.pendingGroup != null && id == this.pendingGroup.id) {
            this.selectPendingTrack();
        } else if (this.pendingTrack != null && id == this.pendingTrack.id) {
            this.focusedTrackId = id;
            this.pendingGroup = null;
            this.pendingTrack = null;
            this.grabbedAmpId = -1;
            this.grabAmp();
        } else if (id != this.focusedTrackId) {
            this.focusedTrackId = -1;
        }
    }

    private void selectPendingTrack() {
        this.pendingGroup = null;
        this.bus.send(new RequestSelectTrack(this.pendingTrack.id, this.pendingTrack.name));
    }

    private void grabAmp() {
        this.devices.stream()
            .filter(d -> AMP.equals(d.name))
            .findFirst()
            .filter(d -> d.id != this.grabbedAmpId)
            .ifPresent(d -> {
                this.grabbedAmpId = d.id;
                this.bus.send(new RequestSelectDevice(d.id), new DeviceGrabbed(d.name));
            });
    }
}
