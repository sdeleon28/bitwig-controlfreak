package dev.tradcode.groupctl.guitarinput;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.guitarinput.events.GuitarsArmed;
import dev.tradcode.groupctl.guitarinput.events.RequestArmGuitars;

/**
 * A track belongs to the guitars group when any of its first {@value #DEPTH}
 * ancestors is named {@value #GROUP}.
 */
public class BitwigGuitarInputTracker implements IEventBusSubscriber {
    static final int TRACKS = 64;
    static final int DEPTH = 3;
    static final String GROUP = "GTRS (3)";

    IEventBus bus;
    TrackBank trackBank;
    boolean[] isGroup = new boolean[TRACKS];
    String[][] ancestors = new String[TRACKS][DEPTH];

    public BitwigGuitarInputTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            final int track = t;
            Track item = this.trackBank.getItemAt(t);
            item.isGroup().addValueObserver(v -> this.isGroup[track] = v);
            item.arm().markInterested();
            item.monitorMode().markInterested();
            Track ancestor = item;
            for (int a = 0; a < DEPTH; a++) {
                final int level = a;
                ancestor = ancestor.createParentTrack(0, 0);
                ancestor.name().addValueObserver(v -> this.ancestors[track][level] = v);
            }
        }
    }

    @Override
    public void on(Event event) {
        if (event instanceof RequestArmGuitars)
            this.armGuitars();
    }

    private void armGuitars() {
        int armed = 0;
        for (int t = 0; t < TRACKS; t++) {
            if (this.isGroup[t] || !this.isGuitar(t))
                continue;
            Track track = this.trackBank.getItemAt(t);
            track.arm().set(true);
            track.monitorMode().set("ON");
            armed++;
        }
        this.bus.send(new GuitarsArmed(armed));
    }

    private boolean isGuitar(int track) {
        for (String name : this.ancestors[track])
            if (GROUP.equals(name))
                return true;
        return false;
    }
}
