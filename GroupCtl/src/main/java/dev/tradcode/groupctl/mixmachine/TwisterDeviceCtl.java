package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestInitRcs;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;

public class TwisterDeviceCtl extends DeviceCtl {
    static int RC_COUNT = 8;

    // Devices with a dedicated controller don't get generic RC treatment, so RC
    // mode stays out of their way by name.
    static final Set<String> RC_BLACKLIST = Set.of("Frequalizer Alt");

    // RC mode is live only for a non-blacklisted selected device while the editor
    // isn't borrowing the Twister. The selection lives in selectedDeviceId and the
    // page arrives with PageSelected, so neither needs a mirror field.
    boolean active = false;

    public TwisterDeviceCtl(IEventBus bus) {
        super(bus);
    }

    private boolean rcDeviceSelected() {
        return this.selectedDeviceId != -1 && !this.isBlacklisted(this.selectedDeviceId);
    }

    private void deselect() {
        this.selectedDeviceId = -1;
        this.active = false;
    }

    private void clearLeds() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new PaintEncoder(i, 0));
    }

    private void clearRings() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new SetEncoderValue(i, 0));
    }

    protected void paint() {
        if (!this.active) return;
        this.clearLeds();
        for (int i = 0; i < RC_COUNT; i++)
            this.bus.send(new PaintEncoder(i, 25));
    }

    Map<Integer, Integer> POSITIONS_TO_IDS = Map.ofEntries(
        Map.entry(1, 4),
        Map.entry(2, 5),
        Map.entry(3, 6),
        Map.entry(4, 7),
        Map.entry(5, 0),
        Map.entry(6, 1),
        Map.entry(7, 2),
        Map.entry(8, 3)
    );

    private int positionToId(int n) {
        return POSITIONS_TO_IDS.getOrDefault(n, -1);
    }

    private int idToPosition(int id) {
        var reversed = new HashMap<Integer, Integer>();
        POSITIONS_TO_IDS.forEach((k, v) -> reversed.put(v, k));
        return reversed.getOrDefault(id, -1);
    }

    private String deviceName(int id) {
        if (this.devices == null) return null;
        return this.devices.stream()
            .filter(d -> d.id == id)
            .findFirst()
            .map(d -> d.name)
            .orElse(null);
    }

    private boolean isBlacklisted(int id) {
        var name = this.deviceName(id);
        return name != null && RC_BLACKLIST.contains(name);
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case PageSelected(int n) -> {
                this.active = this.rcDeviceSelected() && !Page.isEditorPage(n);
                if (!this.active) return;
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case BitwigTrackSelected(int n) -> this.deselect();
            case RequestSelectTrack(int trackId, String name) -> this.deselect();
            case RequestFxSelectTrack(int id, String name) -> this.deselect();
            // state source of truth is on our end for device selection, so we
            // match on the request instead of the response from bw
            case RequestSelectDevice(int n) -> {
                this.selectedDeviceId = n;
                this.active = this.rcDeviceSelected();
                if (!this.active) return;
                this.clearRings();
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case RcValueChanged(int id, double v) -> {
                if (!this.active) return;
                this.bus.send(
                    new SetEncoderValue(
                        this.idToPosition(id),
                        (int) Math.round(v * 127.0)
                    )
                );
            }
            case EncoderTurned(int n, int v) -> {
                if (!this.active) return;
                this.bus.send(
                    new SetRcValue(
                        this.positionToId(n),
                        (double) v / 127.0
                    )
                );
            }
            default -> { }
        }
    }
}
