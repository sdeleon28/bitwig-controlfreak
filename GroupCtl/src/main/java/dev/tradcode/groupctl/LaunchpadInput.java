package dev.tradcode.groupctl;

import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;

public class LaunchpadInput {
    static List<Integer> PADS = Arrays.asList(
        11, 12, 13, 14, 15, 16, 17, 18,
        21, 22, 23, 24, 25, 26, 27, 28,
        31, 32, 33, 34, 35, 36, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48,
        51, 52, 53, 54, 55, 56, 57, 58,
        61, 62, 63, 64, 65, 66, 67, 68,
        71, 72, 73, 74, 75, 76, 77, 78,
        81, 82, 83, 84, 85, 86, 87, 88
    );
    long HOLD_THRESHOLD_MS = 500; // TODO: tune this

    IEventBus bus;
    MidiIn in;
    Set<HeldPad> heldPads = new HashSet<>();

    record HeldPad(int n, Date since) {
        @Override
        public boolean equals(Object other) {
            if (!(other instanceof HeldPad)) return false;
            return this.n == ((HeldPad) other).n;
        }
    }

    public LaunchpadInput(IEventBus bus, MidiIn in) {
        this.bus = bus;
        in.setMidiCallback((int channel, int msg, int vel) -> {
            if (PADS.contains(msg))
                if (vel == 0)
                    this.padUp(msg);
                else
                    this.padDown(msg);
        });
    }

    private void padDown(int n) {
        this.heldPads.add(new HeldPad(n, new Date()));
    }

    private void padUp(int n) {
        heldPads.stream()
            .filter(h -> h.n == n)
            .findFirst()
            .ifPresent(h -> {
                var now = new Date();
                var diffMs = ChronoUnit.MILLIS.between(
                    h.since.toInstant(),
                    now.toInstant()
                );
                if (diffMs > HOLD_THRESHOLD_MS)
                    this.bus.send(new PadLongPressed(n));
                else
                    this.bus.send(new PadClicked(n));
            });
        heldPads.removeIf(h -> h.n == n);
    }
}
