package dev.tradcode.groupctl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import dev.tradcode.groupctl.events.BitwigDevice;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectDevice;

class LaunchpadDeviceCtl implements IEventBusSubscriber {
    IEventBus bus;
    List<BitwigDevice> devices;
    boolean pageActive = true;
    int selectedDeviceId = -1;

    Map<Integer, Integer> GLOBAL_TO_LOCAL = Map.ofEntries(
        // row 1
        Map.entry(51, 1),  Map.entry(52, 2),
        Map.entry(53, 3),  Map.entry(54, 4),
        // row 2
        Map.entry(61, 5),  Map.entry(62, 6),
        Map.entry(63, 7),  Map.entry(64, 8),
        // row 3
        Map.entry(71, 9),  Map.entry(72, 10),
        Map.entry(73, 11), Map.entry(74, 12),
        // row 4
        Map.entry(81, 13), Map.entry(82, 14),
        Map.entry(83, 15), Map.entry(84, 16)
    );

    public LaunchpadDeviceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public int globalToLocalPosition(int gpos) {
        if (gpos == -1) return -1;
        return GLOBAL_TO_LOCAL.getOrDefault(gpos, -1);
    }

    public int localToGlobalPosition(int pos) {
        if (pos == -1) return -1;
        var reversed = new HashMap<Integer, Integer>();
        GLOBAL_TO_LOCAL.forEach((k, v) -> reversed.put(v, k));
        return reversed.getOrDefault(pos, -1);
    }

    private void clearQuadrant() {
        for (int i = 1; i <= 16; i++) {
            var pos = this.localToGlobalPosition(i);
            if (pos == -1)
                continue;
            this.bus.send(new PaintPad(pos, 0));
        }
    }

    public void paint() {
        if (!this.pageActive)
            return;
        this.clearQuadrant();
        this.devices.stream()
            .forEach(d -> {
                var pos = this.localToGlobalPosition(d.getPosition());
                var color = 69;
                if (pos != -1 && color != -1)
                    this.bus.send(
                        d.id == this.selectedDeviceId
                            ? new BlinkPad(pos, color)
                            : new PaintPad(pos, color)
                    );
            });
    }

    private int devicePositionToId(int pos) {
        return pos - 1;
    }
    
    public void on(Event event) {
        switch (event) {
            case PadClicked(int n) when this.pageActive -> {
                var pos = this.globalToLocalPosition(n);
                if (pos != -1) {
                    var id = this.devicePositionToId(pos);
                    if (id == -1) return;
                    this.bus.send(
                        new RequestSelectDevice(id)
                    );
                    this.selectedDeviceId = id;
                }
            }
            case BitwigTrackSelected(int n) -> this.selectedDeviceId = -1;
            case DevicesSchemaChanged(List<BitwigDevice> devices) -> {
                this.devices = devices;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            default -> { }
        }
    }
}
