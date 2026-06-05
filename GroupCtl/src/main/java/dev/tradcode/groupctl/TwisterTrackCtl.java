package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.PanUpdated;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetTrackPan;
import dev.tradcode.groupctl.events.SetTrackVolume;
import dev.tradcode.groupctl.events.VolModeSelected;
import dev.tradcode.groupctl.events.VolumeUpdated;

public class TwisterTrackCtl extends TrackCtl {
    VolPanMode mode = VolPanMode.VOL;

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

    protected void paintRings() {
        this.clearRings();
        this.tracksInSelectedGroup()
            .stream()
            .forEach(t -> this.bus.send(
                new SetEncoderValue(
                    t.getPosition(),
                    (int) Math.round(
                        ((this.mode == VolPanMode.VOL)
                            ? t.volume
                            : t.pan
                        ) * 127
                    )
                )
            ));
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case VolumeUpdated(int id, double v) -> {
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.volume = v;
                        if (this.mode != VolPanMode.VOL) return;
                        this.bus.send(
                            new SetEncoderValue(
                                t.getPosition(),
                                (int) Math.round(v * 127)
                            )
                        );
                    });
            }
            case PanUpdated(int id, double v) -> {
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.pan = v;
                        if (this.mode != VolPanMode.PAN) return;
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
                        this.bus.send(
                            (this.mode == VolPanMode.VOL)
                                ? new SetTrackVolume(
                                    t.id,
                                    ((double) v) / 127.0)
                                : new SetTrackPan(
                                    t.id,
                                    ((double) v) / 127.0)
                        );
                    });
            }
            case VolModeSelected() -> {
                this.mode = VolPanMode.VOL;
                this.paintRings();
            }
            case PanModeSelected() -> {
                this.mode = VolPanMode.PAN;
                this.paintRings();
            }
            default -> { }
        }
    }
}
