package dev.tradcode.groupctl;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.BitwigSend;
import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.PanUpdated;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.SendValueUpdated;
import dev.tradcode.groupctl.events.SendsChanged;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetSelectedTrackSend;
import dev.tradcode.groupctl.events.SetTrackPan;
import dev.tradcode.groupctl.events.SetTrackVolume;
import dev.tradcode.groupctl.events.TrackMode;
import dev.tradcode.groupctl.events.VolModeSelected;
import dev.tradcode.groupctl.events.VolumeUpdated;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;

public class TwisterTrackCtl extends TrackCtl {
    VolPanMode volPanMode = VolPanMode.VOL;
    boolean active = true;
    int selectedFx = -1;
    List<BitwigSend> sends = new ArrayList<>();

    public TwisterTrackCtl(IEventBus bus) {
        super(bus);
    }

    private int bwToTwisterColor(String bwColor) {
        return Colors.toTwister(bwColor);
    }

    private void clearLeds() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new PaintEncoder(i, 0));
    }

    private void clearRings() {
        for (int i = 1; i <= 16; i++)
            this.bus.send(new SetEncoderValue(i, 0));
    }

    /**
     * Shares the lifecycle with the base TrackCtl, which also powers the
     * Launchpad paint. Since the colored LEDs change at the same time as the
     * Launchpad lights do, this method only paints the colors and leaves the
     * rings alone. For rings painting, see paintRings.
     */
    @Override
    protected void paint() {
        if (!active) return;
        this.clearLeds();
        for (var t : this.tracksInSelectedGroup()) {
            var pos = t.getPosition();
            if (pos == -1)
                continue;
            this.bus.send(
                new PaintEncoder(pos, this.bwToTwisterColor(t.color)
            ));
        }
    }

    @Override
    protected void groupUpdated() {
        this.paintRings();
    }

    protected void paintRing(BitwigTrack t) {
        if (!active) return;
        if (this.trackMode == TrackMode.NORMAL)
            this.bus.send(
                new SetEncoderValue(
                    t.getPosition(),
                    (int) Math.round(
                        ((this.volPanMode == VolPanMode.VOL)
                            ? t.volume
                            : t.pan
                        ) * 127
                    )
                )
            );
        else {
            if (this.selectedFx == -1) return;
            this.sends.stream()
                .filter(s -> s.trackId == t.id && s.id == this.selectedFx)
                .findFirst()
                .ifPresent(s -> this.bus.send(
                    new SetEncoderValue(
                        t.getPosition(),
                        (int) Math.round(s.value * 127)
                    )
                ));
        }
    }

    protected void paintRings() {
        if (!active) return;
        this.clearRings();
        this.tracksInSelectedGroup().forEach(this::paintRing);
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case BitwigTrackSelected(int n) -> {
                this.active = true;
                this.trackMode = TrackMode.NORMAL;
                this.paint();
                this.paintRings();
            }
            // state source of truth is on our end for device selection, so we
            // match on the request instead of the response from bw
            case RequestSelectDevice(int n) -> this.active = false;
            case VolumeUpdated(int id, double v) -> {
                if (this.volPanMode != VolPanMode.VOL) return;
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.volume = v;
                        this.bus.send(
                            new SetEncoderValue(
                                t.getPosition(),
                                (int) Math.round(v * 127)
                            )
                        );
                    });
            }
            case PanUpdated(int id, double v) -> {
                if (this.volPanMode != VolPanMode.PAN) return;
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.pan = v;
                        this.bus.send(
                            new SetEncoderValue(
                                t.getPosition(),
                                (int) Math.round(v * 127)
                            )
                        );
                    });
            }
            case EncoderTurned(int n, int v) -> {
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.getPosition() == n)
                    .findFirst()
                    .ifPresent(t -> {
                        if (this.trackMode == TrackMode.NORMAL)
                            this.bus.send(
                                (this.volPanMode == VolPanMode.VOL)
                                    ? new SetTrackVolume(
                                        t.id,
                                        ((double) v) / 127.0)
                                    : new SetTrackPan(
                                        t.id,
                                        ((double) v) / 127.0)
                            );
                        else
                            this.bus.send(
                                new SetSelectedTrackSend(
                                    t.id,
                                    this.selectedFx,
                                    ((double) v) / 127.0)
                            );
                    });
            }
            case VolModeSelected() -> {
                this.volPanMode = VolPanMode.VOL;
                this.paintRings();
            }
            case PanModeSelected() -> {
                this.volPanMode = VolPanMode.PAN;
                this.paintRings();
            }
            case RequestFxSelectTrack(int id, String name) -> {
                this.active = true;
                this.selectedFx = id;
                this.trackMode = TrackMode.FX;
                this.paint();
                this.paintRings();
            }
            case SendsChanged(List<BitwigSend> sends) -> {
                this.sends = sends;
                if (this.trackMode != TrackMode.FX) return;
                this.paintRings();
            }
            case SendValueUpdated(int trackId, int sendId, double v) -> {
                this.sends.stream()
                    .filter(s -> s.trackId == trackId && s.id == sendId)
                    .findFirst()
                    .ifPresent(s -> s.value = v);
                if (this.trackMode != TrackMode.FX) return;
                if (sendId != this.selectedFx) return;
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == trackId)
                    .findFirst()
                    .ifPresent(this::paintRing);
            }
            default -> { }
        }
    }
}
