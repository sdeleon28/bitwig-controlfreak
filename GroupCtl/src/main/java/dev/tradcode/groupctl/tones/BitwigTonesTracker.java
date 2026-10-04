package dev.tradcode.groupctl.tones;

import java.util.regex.Pattern;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.DeviceBank;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.Log;
import dev.tradcode.groupctl.tones.events.RequestTunerMode;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;
import dev.tradcode.groupctl.tones.events.ToneSelected;

/**
 * Tone tracks are the ones named "A (n)" .. "F (n)". The selected one is
 * unmuted, armed and monitored; the rest are muted, disarmed and unmonitored.
 * Muting rather than deactivating keeps the switch instant. Only the selected
 * tone's amp window is left open. Tuner mode mutes every tone, closes the amp
 * windows, and opens the tuner's window and arms the track it sits on.
 */
public class BitwigTonesTracker implements IEventBusSubscriber {
    static final int TRACKS = 64;
    static final int DEVICES_PER_TRACK = 8;
    static final String TUNER = "LockOn";
    static final Pattern TONE_TRACK = Pattern.compile("^([A-F]) \\(\\d+\\)$");

    IEventBus bus;
    TrackBank trackBank;
    String[] names = new String[TRACKS];
    DeviceBank[] deviceBanks = new DeviceBank[TRACKS];
    String[][] deviceNames = new String[TRACKS][DEVICES_PER_TRACK];

    public BitwigTonesTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            final int track = t;
            Track item = this.trackBank.getItemAt(t);
            item.name().addValueObserver(v -> this.names[track] = v);
            item.mute().markInterested();
            item.arm().markInterested();
            item.monitorMode().markInterested();
            this.deviceBanks[t] = item.createDeviceBank(DEVICES_PER_TRACK);
            for (int d = 0; d < DEVICES_PER_TRACK; d++) {
                final int slot = d;
                var device = this.deviceBanks[t].getDevice(d);
                device.name().addValueObserver(v -> this.deviceNames[track][slot] = v);
                device.isWindowOpen().markInterested();
            }
        }
    }

    @Override
    public void on(Event event) {
        if (event instanceof RequestSelectTone e)
            this.select(e.tone());
        else if (event instanceof RequestTunerMode)
            this.tunerMode();
    }

    private void tunerMode() {
        for (int t = 0; t < TRACKS; t++) {
            if (this.names[t] != null && TONE_TRACK.matcher(this.names[t]).matches()) {
                this.trackBank.getItemAt(t).mute().set(true);
                this.setWindow(t, ToneFocusCtl.AMP, false);
            }
        }
        for (int t = 0; t < TRACKS; t++) {
            if (this.hasDevice(t, TUNER)) {
                this.setWindow(t, TUNER, true);
                this.trackBank.getItemAt(t).arm().set(true);
            }
        }
    }

    private void leaveTunerMode() {
        for (int t = 0; t < TRACKS; t++) {
            if (this.hasDevice(t, TUNER)) {
                this.setWindow(t, TUNER, false);
                this.trackBank.getItemAt(t).arm().set(false);
            }
        }
    }

    private void select(char tone) {
        int found = 0;
        int selectedTrack = -1;
        String selected = null;
        this.leaveTunerMode();
        for (int t = 0; t < TRACKS; t++) {
            if (this.names[t] == null)
                continue;
            var m = TONE_TRACK.matcher(this.names[t]);
            if (!m.matches())
                continue;
            found++;
            boolean on = m.group(1).charAt(0) == tone;
            Track track = this.trackBank.getItemAt(t);
            track.mute().set(!on);
            track.arm().set(on);
            track.monitorMode().set(on ? "ON" : "OFF");
            if (on) {
                selected = this.names[t];
                selectedTrack = t;
            } else {
                this.setWindow(t, ToneFocusCtl.AMP, false);
            }
        }
        if (selectedTrack != -1)
            this.setWindow(selectedTrack, ToneFocusCtl.AMP, true);
        this.bus.send(new Log("Tone " + tone + " (" + found + " tone tracks)"));
        if (selected != null)
            this.bus.send(new ToneSelected(selected));
    }

    private boolean hasDevice(int track, String deviceName) {
        for (int d = 0; d < DEVICES_PER_TRACK; d++)
            if (deviceName.equals(this.deviceNames[track][d]))
                return true;
        return false;
    }

    private void setWindow(int track, String deviceName, boolean open) {
        for (int d = 0; d < DEVICES_PER_TRACK; d++)
            if (deviceName.equals(this.deviceNames[track][d]))
                this.deviceBanks[track].getDevice(d).isWindowOpen().set(open);
    }
}
