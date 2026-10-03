package dev.tradcode.groupctl.tones;

import java.util.regex.Pattern;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.Log;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;
import dev.tradcode.groupctl.tones.events.ToneSelected;

/**
 * Tone tracks are the ones named "A (n)" .. "F (n)". The selected one is
 * activated, armed and monitored; the rest are deactivated, disarmed and
 * unmonitored, so only one tone ever processes audio.
 */
public class BitwigTonesTracker implements IEventBusSubscriber {
    static final int TRACKS = 64;
    static final Pattern TONE_TRACK = Pattern.compile("^([A-F]) \\(\\d+\\)$");

    IEventBus bus;
    TrackBank trackBank;
    String[] names = new String[TRACKS];

    public BitwigTonesTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            final int track = t;
            Track item = this.trackBank.getItemAt(t);
            item.name().addValueObserver(v -> this.names[track] = v);
            item.isActivated().markInterested();
            item.arm().markInterested();
            item.monitorMode().markInterested();
        }
    }

    @Override
    public void on(Event event) {
        if (event instanceof RequestSelectTone e)
            this.select(e.tone());
    }

    private void select(char tone) {
        int found = 0;
        String selected = null;
        for (int t = 0; t < TRACKS; t++) {
            if (this.names[t] == null)
                continue;
            var m = TONE_TRACK.matcher(this.names[t]);
            if (!m.matches())
                continue;
            found++;
            boolean on = m.group(1).charAt(0) == tone;
            Track track = this.trackBank.getItemAt(t);
            track.isActivated().set(on);
            track.arm().set(on);
            track.monitorMode().set(on ? "ON" : "OFF");
            if (on)
                selected = this.names[t];
        }
        this.bus.send(new Log("Tone " + tone + " (" + found + " tone tracks)"));
        if (selected != null)
            this.bus.send(new ToneSelected(selected));
    }
}
