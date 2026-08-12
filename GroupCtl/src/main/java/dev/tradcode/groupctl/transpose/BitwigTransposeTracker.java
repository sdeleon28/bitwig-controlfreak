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
import dev.tradcode.groupctl.params.DeviceParams;
import dev.tradcode.groupctl.transpose.events.MarkedDevicesChanged;
import dev.tradcode.groupctl.transpose.events.RequestDeviceParamWrite;

/**
 * The Bitwig side of global transpose: finds every
 * {@value TransposeMarker#MARKER}-marked device in the project and writes the
 * params the strategies ask for.
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

    IEventBus bus;
    TrackBank trackBank;
    DeviceBank[] deviceBanks = new DeviceBank[TRACKS];
    DeviceParams[][] params = new DeviceParams[TRACKS][DEVICES_PER_TRACK];
    String[][] names = new String[TRACKS][DEVICES_PER_TRACK];
    boolean[][] exists = new boolean[TRACKS][DEVICES_PER_TRACK];
    boolean[][] warned = new boolean[TRACKS][DEVICES_PER_TRACK];
    List<MarkedDevice> assigned = new ArrayList<>();
    boolean cacheDirty = false;

    public BitwigTransposeTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        if (host == null)
            return;

        this.trackBank = host.createTrackBank(TRACKS, 0, 0);
        for (int t = 0; t < TRACKS; t++) {
            final int track = t;
            this.deviceBanks[t] = this.trackBank.getItemAt(t)
                .createDeviceBank(DEVICES_PER_TRACK);
            for (int d = 0; d < DEVICES_PER_TRACK; d++) {
                final int slot = d;
                var device = this.deviceBanks[t].getDevice(d);
                device.name().addValueObserver(v -> {
                    this.names[track][slot] = v;
                    this.warned[track][slot] = false;
                    this.cacheDirty = true;
                });
                device.exists().addValueObserver(v -> {
                    this.exists[track][slot] = v;
                    this.cacheDirty = true;
                });
                this.params[t][d] = new DeviceParams(device);
            }
        }
    }

    public void flush() {
        if (!this.cacheDirty)
            return;
        this.cacheDirty = false;
        var found = this.scan();
        if (found.equals(this.assigned))
            return;
        this.assigned = found;
        this.log(found.size() + " device(s) marked " + TransposeMarker.MARKER
            + ": " + describe(found));
        this.bus.send(new MarkedDevicesChanged(found));
    }

    private List<MarkedDevice> scan() {
        var found = new ArrayList<MarkedDevice>();
        for (int t = 0; t < TRACKS; t++)
            for (int d = 0; d < DEVICES_PER_TRACK; d++)
                if (this.exists[t][d] && TransposeMarker.isMarked(this.names[t][d]))
                    found.add(new MarkedDevice(t, d, this.names[t][d]));
        return found;
    }

    private void write(RequestDeviceParamWrite request) {
        var device = request.device();
        var params = this.params[device.track()][device.slot()];
        if (params == null)
            return;

        String id = params.resolve(request.aliases());
        if (id == null) {
            if (this.warned[device.track()][device.slot()])
                return;
            this.warned[device.track()][device.slot()] = true;
            this.log("\"" + device.name() + "\" has no " + request.aliases()
                + " param — " + params.size() + " seen, closest: "
                + params.namesMatching("trans") + params.namesMatching("semi")
                + params.namesMatching("pitch"));
            return;
        }
        params.write(id, request.value(), request.outOf());
        this.log("\"" + device.name() + "\" " + params.nameOf(id) + " <- "
            + request.value() + "/" + request.outOf());
    }

    private void log(String message) {
        this.bus.send(new Log("[Transpose] " + message));
    }

    private static String describe(List<MarkedDevice> devices) {
        return devices.isEmpty() ? "(none)"
            : String.join(", ", devices.stream().map(MarkedDevice::name).toList());
    }

    public void on(Event event) {
        switch (event) {
            case RequestDeviceParamWrite request -> this.write(request);
            default -> { }
        }
    }
}
