package dev.tradcode.groupctl.mixmachine.masterrc;

import java.util.HashMap;
import java.util.Map;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcNameChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterTempoChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestSetTempo;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

/**
 * Twister program: the bottom 8 encoders (positions 1..8) show and edit the
 * first page of the master track's remote controls. Activation follows the
 * master track's selection ({@link BitwigTrackSelected} carrying the master
 * sentinel id); like every other twister program it yields the encoders when a
 * device is selected.
 *
 * RC 0 is mapped to Tempo: its encoder maps the absolute 0..127 position onto a
 * fixed BPM range ({@link RequestSetTempo}) instead of writing a normalized
 * value, so the far left is always {@value #MIN_BPM} BPM and the far right
 * {@value #MAX_BPM} BPM regardless of where the tempo was when it was activated.
 */
public class TwisterMasterRcCtl implements IEventBusSubscriber {
    static int RC_COUNT = 8;
    static int RC_COLOR = 19; // twister blinding cyan
    static int TEMPO_RC_ID = 0;
    static final int MIN_BPM = 30;
    static final int MAX_BPM = 230;

    IEventBus bus;
    boolean masterSelected = false;
    boolean editorPageActive = false;
    boolean deviceBorrowed = false;
    double[] values = new double[RC_COUNT];
    boolean[] exists = new boolean[RC_COUNT];
    String[] names = new String[RC_COUNT];
    double tempoBpm = MIN_BPM;

    Map<Integer, Integer> POSITIONS_TO_IDS = Map.ofEntries(
        Map.entry(1, 4), Map.entry(2, 5), Map.entry(3, 6), Map.entry(4, 7),
        Map.entry(5, 0), Map.entry(6, 1), Map.entry(7, 2), Map.entry(8, 3)
    );

    public TwisterMasterRcCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.masterSelected && !this.editorPageActive && !this.deviceBorrowed;
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
        for (int id = 0; id < RC_COUNT; id++)
            this.paintLed(id);
    }

    private void paintLed(int id) {
        if (!isActive()) return;
        this.bus.send(
            new PaintEncoder(this.idToPosition(id), this.exists[id] ? RC_COLOR : 0)
        );
    }

    private void paintRing(int id) {
        if (!isActive()) return;
        int v = id == TEMPO_RC_ID
            ? this.bpmToPosition(this.tempoBpm)
            : (int) Math.round(this.values[id] * 127.0);
        this.bus.send(new SetEncoderValue(this.idToPosition(id), v));
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

    private int positionToBpm(int v) {
        return MIN_BPM + (int) Math.round(v * (MAX_BPM - MIN_BPM) / 127.0);
    }

    private int bpmToPosition(double bpm) {
        int pos = (int) Math.round((bpm - MIN_BPM) * 127.0 / (MAX_BPM - MIN_BPM));
        return Math.max(0, Math.min(127, pos));
    }

    public void on(Event event) {
        switch (event) {
            case BitwigTrackSelected(int id) -> {
                this.masterSelected = id == BitwigMasterRcTracker.MASTER_ID;
                this.deviceBorrowed = false;
                this.activate();
            }
            case RequestSelectDevice(int n) -> this.deviceBorrowed = true;
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (isActive()) this.activate();
            }
            case MasterRcValueChanged(int id, double v) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.values[id] = v;
                this.paintRing(id);
            }
            case MasterTempoChanged(double bpm) -> {
                this.tempoBpm = bpm;
                this.paintRing(TEMPO_RC_ID);
            }
            case MasterRcExistsChanged(int id, boolean e) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.exists[id] = e;
                this.paintLed(id);
            }
            case MasterRcNameChanged(int id, String name) -> {
                if (id < 0 || id >= RC_COUNT) return;
                this.names[id] = name;
            }
            case EncoderButtonPressed(int n) -> {
                if (!isActive()) return;
                int id = this.positionToId(n);
                if (id < 0 || !this.exists[id] || this.names[id] == null) return;
                this.bus.send(new MasterRcEncoderPressed(this.names[id]));
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                int id = this.positionToId(n);
                if (id < 0) return;
                if (id == TEMPO_RC_ID) {
                    this.bus.send(new RequestSetTempo(this.positionToBpm(v)));
                    return;
                }
                this.bus.send(new SetMasterRcValue(id, (double) v / 127.0));
            }
            default -> { }
        }
    }
}
