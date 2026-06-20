package dev.tradcode.groupctl;

import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.MidiIn;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;
import dev.tradcode.groupctl.events.PadLongPressStarted;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.SideButtonLongPressed;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;
import dev.tradcode.groupctl.events.TopButtonReleased;

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
    static List<Integer> TOP_BUTTONS = Arrays.asList(
        104, 105, 106, 107, 108, 109, 110, 111
    );
    static List<Integer> SIDE_BUTTONS = Arrays.asList(
        89, 79, 69, 59, 49, 39, 29, 19
    );
    long HOLD_THRESHOLD_MS = 500; // TODO: tune this

    IEventBus bus;
    MidiIn in;
    ControllerHost host;
    Set<HeldPad> heldPads = new HashSet<>();
    Set<Integer> startedHolds = new HashSet<>();
    Set<HeldPad> heldSideButtons = new HashSet<>();

    record HeldPad(int n, Date since) {
        @Override
        public boolean equals(Object other) {
            if (!(other instanceof HeldPad)) return false;
            return this.n == ((HeldPad) other).n;
        }
    }

    public LaunchpadInput(IEventBus bus, MidiIn in, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        in.setMidiCallback((int channel, int msg, int vel) -> {
            if (PADS.contains(msg))
                if (vel == 0)
                    this.padUp(msg);
                else
                    this.padDown(msg);
            if (TOP_BUTTONS.contains(msg))
                if (vel == 0)
                    this.topButtonUp(msg);
                else
                    this.topButtonDown(msg);
            if (SIDE_BUTTONS.contains(msg))
                if (vel == 0)
                    this.sideButtonUp(msg);
                else
                    this.sideButtonDown(msg);
        });
    }

    private TopButton topButtonFor(int n) {
        return switch (n) {
            case 104 -> TopButton.UP;
            case 105 -> TopButton.DOWN;
            case 106 -> TopButton.LEFT;
            case 107 -> TopButton.RIGHT;
            case 108 -> TopButton.SESSION;
            case 109 -> TopButton.USER_1;
            case 110 -> TopButton.USER_2;
            case 111 -> TopButton.MIXER;
            default -> null;
        };
    }

    private void topButtonUp(int n) {
        TopButton btn = this.topButtonFor(n);
        if (btn != null)
            this.bus.send(new TopButtonReleased(btn));
    }

    private void topButtonDown(int n) {
        TopButton btn = this.topButtonFor(n);
        if (btn != null)
            this.bus.send(new TopButtonClick(btn));
    }

    private SideButton sideButtonFor(int n) {
        return switch (n) {
            case 89 -> SideButton.VOLUME;
            case 79 -> SideButton.PAN;
            case 69 -> SideButton.SEND_A;
            case 59 -> SideButton.SEND_B;
            case 49 -> SideButton.STOP;
            case 39 -> SideButton.MUTE;
            case 29 -> SideButton.SOLO;
            case 19 -> SideButton.RECORD_ARM;
            default -> null;
        };
    }

    private void sideButtonDown(int n) {
        this.heldSideButtons.add(new HeldPad(n, new Date()));
    }

    private void sideButtonUp(int n) {
        SideButton btn = this.sideButtonFor(n);
        if (btn == null)
            return;
        heldSideButtons.stream()
            .filter(h -> h.n == n)
            .findFirst()
            .ifPresent(h -> {
                var now = new Date();
                var diffMs = ChronoUnit.MILLIS.between(
                    h.since.toInstant(),
                    now.toInstant()
                );
                if (diffMs > HOLD_THRESHOLD_MS)
                    this.bus.send(new SideButtonLongPressed(btn));
                else
                    this.bus.send(new SideButtonClick(btn));
            });
        heldSideButtons.removeIf(h -> h.n == n);
    }

    private void padDown(int n) {
        var pressedAt = new Date();
        this.heldPads.add(new HeldPad(n, pressedAt));
        this.host.scheduleTask(() -> this.holdElapsed(n, pressedAt), HOLD_THRESHOLD_MS);
    }

    private void holdElapsed(int n, Date pressedAt) {
        boolean stillHeldSamePress = heldPads.stream()
            .anyMatch(h -> h.n == n && h.since == pressedAt);
        if (!stillHeldSamePress || !this.startedHolds.add(n))
            return;
        this.bus.send(new PadLongPressStarted(n));
    }

    private void padUp(int n) {
        if (this.startedHolds.contains(n))
            this.bus.send(new PadLongPressed(n));
        else
            this.bus.send(new PadClicked(n));
        this.startedHolds.remove(n);
        this.heldPads.removeIf(h -> h.n == n);
    }
}
