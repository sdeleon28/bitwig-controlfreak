package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.SetEncoderValue;

public class TwisterDeviceCtl extends DeviceCtl {
    boolean active = false;

    public TwisterDeviceCtl(IEventBus bus) {
        super(bus);
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
        if (!active) return;
        this.clearLeds();
        this.clearRings();
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case BitwigTrackSelected(int n) -> this.active = false;
            // state source of truth is on our end for device selection, so we
            // match on the request instead of the response from bw
            case RequestSelectDevice(int n) -> {
                this.active = true;
                this.paint();
            }
            default -> { }
        }
    }
}
