package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestInitRcs;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import java.util.HashMap;
import java.util.Map;

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
    boolean active = false;

    // The editor page borrows the whole Twister; RC mode goes dark there and is
    // restored on the way out. See TwisterTrackEncoderCtl for the sibling gate.
    boolean editorPageActive = false;

    public TwisterDeviceCtl(IEventBus bus) {
        super(bus);
    }

    private boolean isActive() {
        return this.active && !this.editorPageActive;
    }

    private void onPageSelected(int n) {
        this.editorPageActive = n == Page.EDITOR.getValue();
        if (!this.isActive()) return;
        this.paint();
        this.bus.send(new RequestInitRcs());
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
        if (!isActive()) return;
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

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case PageSelected(int n) -> this.onPageSelected(n);
            case BitwigTrackSelected(int n) -> this.active = false;
            case RequestSelectTrack(int trackId, String name) ->
                this.active = false;
            case RequestFxSelectTrack(int id, String name) ->
                this.active = false;
            // state source of truth is on our end for device selection, so we
            // match on the request instead of the response from bw
            case RequestSelectDevice(int n) -> {
                this.active = true;
                this.clearRings();
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case RcValueChanged(int id, double v) -> {
                if (!isActive()) return;
                this.bus.send(
                    new SetEncoderValue(
                        this.idToPosition(id),
                        (int) Math.round(v * 127.0)
                    )
                );
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
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
