package dev.tradcode.groupctl.mixmachine.masterrc;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.TwisterRcGeometry;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcNameChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterTempoChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestSetTempo;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

/**
 * Twister program: the master track's remote controls, spread across all 16
 * encoders. The bottom 8 (positions 1..8) host the first remote-controls page,
 * the top 8 (positions 9..16) the second; both come through as flat 0..15 slots
 * via {@link TwisterRcGeometry}. Activation follows the master track's selection
 * ({@link BitwigTrackSelected} carrying the master sentinel id); like every
 * other twister program it yields the encoders when a device is selected.
 *
 * Slot 0 is mapped to Tempo: its encoder maps the absolute 0..127 position onto
 * a fixed BPM range ({@link RequestSetTempo}) instead of writing a normalized
 * value, so the far left is always {@value #MIN_BPM} BPM and the far right
 * {@value #MAX_BPM} BPM regardless of where the tempo was when it was activated.
 */
public class TwisterMasterRcCtl implements IEventBusSubscriber {
    static int SLOT_COUNT = TwisterRcGeometry.SLOT_COUNT;
    static int RC_COLOR = 19; // twister blinding cyan
    static int TEMPO_RC_ID = 0;
    static final int MIN_BPM = 30;
    static final int MAX_BPM = 230;

    IEventBus bus;
    boolean masterSelected = false;
    boolean editorPageActive = false;
    boolean deviceBorrowed = false;
    double[] values = new double[SLOT_COUNT];
    boolean[] exists = new boolean[SLOT_COUNT];
    String[] names = new String[SLOT_COUNT];
    double tempoBpm = MIN_BPM;

    public TwisterMasterRcCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private boolean isActive() {
        return this.masterSelected && !this.editorPageActive && !this.deviceBorrowed;
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
        for (int slot = 0; slot < SLOT_COUNT; slot++)
            this.paintLed(slot);
    }

    private void paintLed(int slot) {
        if (!isActive()) return;
        this.bus.send(
            new PaintEncoder(TwisterRcGeometry.positionForSlot(slot), this.exists[slot] ? RC_COLOR : 0)
        );
    }

    private void paintRing(int slot) {
        if (!isActive()) return;
        int v = slot == TEMPO_RC_ID
            ? this.bpmToPosition(this.tempoBpm)
            : (int) Math.round(this.values[slot] * 127.0);
        this.bus.send(new SetEncoderValue(TwisterRcGeometry.positionForSlot(slot), v));
    }

    private void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        for (int slot = 0; slot < SLOT_COUNT; slot++)
            this.paintRing(slot);
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
            case DeviceGrabbed(String name) -> this.deviceBorrowed = true;
            case PageSelected(int n) -> {
                this.editorPageActive = Page.isEditorPage(n);
                if (isActive()) this.activate();
            }
            case MasterRcValueChanged(int slot, double v) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.values[slot] = v;
                this.paintRing(slot);
            }
            case MasterTempoChanged(double bpm) -> {
                this.tempoBpm = bpm;
                this.paintRing(TEMPO_RC_ID);
            }
            case MasterRcExistsChanged(int slot, boolean e) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.exists[slot] = e;
                this.paintLed(slot);
            }
            case MasterRcNameChanged(int slot, String name) -> {
                if (slot < 0 || slot >= SLOT_COUNT) return;
                this.names[slot] = name;
            }
            case EncoderButtonPressed(int n) -> {
                if (!isActive()) return;
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0 || !this.exists[slot] || this.names[slot] == null) return;
                this.bus.send(new MasterRcEncoderPressed(this.names[slot]));
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                int slot = TwisterRcGeometry.slotForPosition(n);
                if (slot < 0) return;
                if (slot == TEMPO_RC_ID) {
                    this.bus.send(new RequestSetTempo(this.positionToBpm(v)));
                    return;
                }
                this.bus.send(new SetMasterRcValue(slot, (double) v / 127.0));
            }
            default -> { }
        }
    }
}
