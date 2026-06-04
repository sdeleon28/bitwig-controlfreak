package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;

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
