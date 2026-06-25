package dev.tradcode.groupctl.mixmachine.masterrc;

import java.util.HashMap;
import java.util.Map;

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
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

public class TwisterMasterRcCtl implements IEventBusSubscriber {
    static int RC_COUNT = 8;
    static int RC_COLOR = 25;

    IEventBus bus;
    boolean selected = false;
    boolean editorPageActive = false;
    double[] values = new double[RC_COUNT];

    Map<Integer, Integer> POSITIONS_TO_IDS = Map.ofEntries(
        Map.entry(1, 4), Map.entry(2, 5), Map.entry(3, 6), Map.entry(4, 7),
        Map.entry(5, 0), Map.entry(6, 1), Map.entry(7, 2), Map.entry(8, 3)
    );

    public TwisterMasterRcCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.selected && !this.editorPageActive;
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
        for (int n = 1; n <= RC_COUNT; n++)
            this.bus.send(new PaintEncoder(n, RC_COLOR));
    }

    private void paintRing(int id) {
        if (!isActive()) return;
        this.bus.send(
            new SetEncoderValue(this.idToPosition(id), (int) Math.round(this.values[id] * 127.0))
        );
    }

    private void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        for (int id = 0; id < RC_COUNT; id++)
            this.paintRing(id);
    }

    private void activate() {
        if (!isActive()) return;
        this.paint();
        this.paintRings();
    }

    public void on(Event event) {
        switch (event) {
            case MasterRcSelected() -> {
                this.selected = true;
                this.activate();
            }
            case BitwigTrackSelected(int n) -> this.selected = false;
            case RequestSelectTrack(int id, String name) -> this.selected = false;
            case RequestFxSelectTrack(int id, String name) -> this.selected = false;
            case RequestSelectDevice(int n) -> this.selected = false;
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (isActive()) this.activate();
            }
            case MasterRcValueChanged(int id, double v) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.values[id] = v;
                this.paintRing(id);
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                int id = this.positionToId(n);
                if (id < 0) return;
                this.bus.send(new SetMasterRcValue(id, (double) v / 127.0));
            }
            default -> { }
        }
    }
}
