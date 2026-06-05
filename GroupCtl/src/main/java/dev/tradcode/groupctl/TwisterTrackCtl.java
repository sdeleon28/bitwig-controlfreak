package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
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

    @Override
    protected void groupUpdated() {
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
                        this.bus.send(
                            new SetEncoderValue(
                                t.getPosition(),
                                (int) Math.round(v * 127)
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
