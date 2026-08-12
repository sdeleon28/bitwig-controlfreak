package dev.tradcode.groupctl.transpose;

import java.util.ArrayList;
import java.util.List;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.DeviceBank;
import com.bitwig.extension.controller.api.TrackBank;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.Log;
import dev.tradcode.groupctl.events.RequestSetTranspose;
import dev.tradcode.groupctl.params.DeviceParams;

/**
 * Finds every {@value TransposeMapping#MARKER}-marked device in the project and
 * moves them together.
 *
 * Every device is held in place by a per-track {@link DeviceBank}, never through
 * a cursor. A {@code CursorDevice} tracks the selection, and this feature is
 * driven from the master track's encoder page — selecting master to reach the
 * encoder would drag every cursor off the devices we mean to write to. Bank
 * devices are ordinary {@code Device} proxies with the same direct-parameter
 * API, and they stay put.
 *
 * The observers registered here are the cheap ones: names and exists for
 * discovery, plus direct-parameter ids and names for addressing. Direct
 * parameter *values* are never observed — those stream continuously and are the
 * expensive half of the API — so the standing cost is a one-time burst of
 * parameter names per device that actually exists.
 */
public class BitwigTransposeTracker implements IEventBusSubscriber {
    static final int TRACKS = 64;
    static final int DEVICES_PER_TRACK = 8;
    static final long VERIFY_MS = 250;

    record DeviceRef(int track, int device, String name) { }

    IEventBus bus;
    ControllerHost host;
    TrackBank trackBank;
    DeviceBank[] deviceBanks = new DeviceBank[TRACKS];
    DeviceParams[][] params = new DeviceParams[TRACKS][DEVICES_PER_TRACK];
    String[][] names = new String[TRACKS][DEVICES_PER_TRACK];
    String[][] watching = new String[TRACKS][DEVICES_PER_TRACK];
    boolean[][] warned = new boolean[TRACKS][DEVICES_PER_TRACK];
    boolean[][] exists = new boolean[TRACKS][DEVICES_PER_TRACK];
    List<DeviceRef> assigned = new ArrayList<>();
    boolean cacheDirty = false;
    boolean verifyPending = false;
    // Nothing is written until the encoder is actually moved: on startup we have
    // no idea what the plugins are set to, and forcing them to our notion of
    // zero would silently overwrite whatever was saved with the project.
    boolean engaged = false;
    int semitones = 0;

    public BitwigTransposeTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        if (host == null)
            return;

        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            final int track = t;
            this.deviceBanks[t] = this.trackBank.getItemAt(t)
                .createDeviceBank(DEVICES_PER_TRACK);
            for (int d = 0; d < DEVICES_PER_TRACK; d++) {
                final int device = d;
                var slot = this.deviceBanks[t].getDevice(d);
                slot.name().addValueObserver(v -> {
                    this.names[track][device] = v;
                    this.cacheDirty = true;
                });
                slot.exists().addValueObserver(v -> {
                    this.exists[track][device] = v;
                    this.cacheDirty = true;
                });
                this.params[t][d] = new DeviceParams(slot);
            }
        }
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
        this.cacheDirty = false;
        var found = this.marked();
        if (found.equals(this.assigned))
            return;
        this.assigned = found;
        for (var ref : found)
            this.warned[ref.track()][ref.device()] = false;
        this.log(this.assigned.size() + " device(s) marked "
            + TransposeMapping.MARKER + ": " + this.describe());
        if (this.engaged)
            this.apply();
    }

    private List<DeviceRef> marked() {
        var found = new ArrayList<DeviceRef>();
        for (int t = 0; t < TRACKS; t++)
            for (int d = 0; d < DEVICES_PER_TRACK; d++)
                if (this.exists[t][d] && TransposeMapping.isMarked(this.names[t][d]))
                    found.add(new DeviceRef(t, d, this.names[t][d]));
        return found;
    }

    private String describe() {
        var sb = new StringBuilder();
        for (var ref : this.assigned) {
            if (sb.length() > 0)
                sb.append(", ");
            sb.append(ref.name());
        }
        return sb.length() == 0 ? "(none)" : sb.toString();
    }

    private void apply() {
        for (var ref : this.assigned)
            this.applyTo(ref);
        // sweeping the encoder fires a write per semitone; one verify sweep per
        // settling period is plenty and keeps the console readable
        if (this.host == null || this.verifyPending)
            return;
        this.verifyPending = true;
        this.host.scheduleTask(this::verify, VERIFY_MS);
    }

    private void applyTo(DeviceRef ref) {
        var device = this.params[ref.track()][ref.device()];
        var target = TransposeMapping.targetFor(ref.name());
        String id = device.resolve(target.aliases());
        if (id == null) {
            if (this.warned[ref.track()][ref.device()])
                return;
            this.warned[ref.track()][ref.device()] = true;
            this.log("\"" + ref.name() + "\" UNRESOLVED for " + target.aliases()
                + " — " + device.size() + " params seen, candidates: "
                + device.namesMatching("pitch")
                + device.namesMatching("trans")
                + device.namesMatching("tune"));
            return;
        }
        if (!id.equals(this.watching[ref.track()][ref.device()])) {
            this.watching[ref.track()][ref.device()] = id;
            device.watchDisplay(id);
        }
        device.write(id, target.offsetFor(this.effectiveFor(ref)), target.span());
    }

    private int effectiveFor(DeviceRef ref) {
        return TransposeMapping.baselineOf(ref.name()) + this.semitones;
    }

    private void verify() {
        this.verifyPending = false;
        for (var ref : this.assigned) {
            String id = this.watching[ref.track()][ref.device()];
            if (id == null)
                continue;
            var device = this.params[ref.track()][ref.device()];
            var target = TransposeMapping.targetFor(ref.name());
            int effective = this.effectiveFor(ref);
            this.log("\"" + ref.name() + "\" param \"" + device.nameOf(id) + "\" <- "
                + target.offsetFor(effective) + "/" + target.span()
                + " for " + effective + " st"
                + " (reads " + device.displayOf(id) + ")");
        }
    }

    private void log(String message) {
        this.bus.send(new Log("[Transpose] " + message));
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetTranspose(int st) -> {
                this.semitones = st;
                this.engaged = true;
                this.apply();
            }
            default -> { }
        }
    }
}
