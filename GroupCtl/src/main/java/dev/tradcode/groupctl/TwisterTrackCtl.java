package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetTrackVolume;
import dev.tradcode.groupctl.events.VolumeUpdated;

public class TwisterTrackCtl extends TrackCtl {
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

    @Override
    protected void groupUpdated() {
        this.clearRings();
        this.tracksInSelectedGroup()
            .stream()
            .forEach(t -> {
                this.bus.send(
                    new SetEncoderValue(
                        t.getPosition(),
                        (int) Math.round(t.volume * 127)
                    )
                );
            });
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
                            new SetTrackVolume(
                                t.id,
                                ((double) v) / 127.0
                            )
                        );
                    });
            }
            default -> { }
        }
    }

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
}
