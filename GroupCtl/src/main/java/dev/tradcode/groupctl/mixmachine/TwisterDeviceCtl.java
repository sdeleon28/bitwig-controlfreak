package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestInitRcs;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;

public class TwisterDeviceCtl implements IEventBusSubscriber {
    static int RC_COUNT = 8;

    static final Set<String> RC_BLACKLIST = Set.of("Frequalizer Alt");

    IEventBus bus;
    boolean grabbed = false;
    String grabbedName = null;
    boolean editorPageActive = false;

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

    public TwisterDeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.grabbed
            && this.grabbedName != null
            && !RC_BLACKLIST.contains(this.grabbedName)
            && !this.editorPageActive;
    }

    private void deselect() {
        this.grabbed = false;
        this.grabbedName = null;
    }

    private int positionToId(int n) {
        return POSITIONS_TO_IDS.getOrDefault(n, -1);
    }

    private int idToPosition(int id) {
        var reversed = new HashMap<Integer, Integer>();
        POSITIONS_TO_IDS.forEach((k, v) -> reversed.put(v, k));
        return reversed.getOrDefault(id, -1);
    }

    private void clearLeds() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new PaintEncoder(i, 0));
    }

    private void clearRings() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new SetEncoderValue(i, 0));
    }

    private void paint() {
        if (!isActive()) return;
        this.clearLeds();
        for (int i = 0; i < RC_COUNT; i++)
            this.bus.send(new PaintEncoder(i, 25));
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case DeviceGrabbed(String name) -> {
                this.grabbed = true;
                this.grabbedName = name;
                if (!isActive()) return;
                this.clearRings();
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (!isActive()) return;
                this.paint();
                this.bus.send(new RequestInitRcs());
            }
            case BitwigTrackSelected(int n) -> this.deselect();
            case RequestSelectTrack(int trackId, String name) -> this.deselect();
            case RequestFxSelectTrack(int id, String name) -> this.deselect();
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
