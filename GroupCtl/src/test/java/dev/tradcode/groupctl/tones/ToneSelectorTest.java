package dev.tradcode.groupctl.tones;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.tones.events.FootswitchPressed;
import dev.tradcode.groupctl.tones.events.FootswitchReleased;
import dev.tradcode.groupctl.tones.events.RequestMuteTones;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;

class ToneSelectorTest {
    static List<Character> tones(Event... events) {
        var bus = new FakeEventBus();
        new ToneSelector(bus);
        bus.send(events);
        return bus.events.stream()
            .filter(RequestSelectTone.class::isInstance)
            .map(e -> ((RequestSelectTone) e).tone())
            .toList();
    }

    static Event down(int n) { return new FootswitchPressed(n); }
    static Event up(int n) { return new FootswitchReleased(n); }

    @Test
    void singleSwitchesSelectAThroughD() {
        assertEquals(List.of('A', 'B', 'C', 'D'), tones(
            down(0), up(0), down(1), up(1), down(2), up(2), down(3), up(3)));
    }

    @Test
    void nothingIsSelectedWhileASwitchIsHeld() {
        assertEquals(List.of(), tones(down(0)));
    }

    @Test
    void aPlusBSelectsE() {
        assertEquals(List.of('E'), tones(down(0), down(1), up(1), up(0)));
    }

    @Test
    void cPlusDSelectsFRegardlessOfReleaseOrder() {
        assertEquals(List.of('F'), tones(down(3), down(2), up(3), up(2)));
    }

    @Test
    void unmappedCombinationsAreIgnored() {
        assertEquals(List.of('A'), tones(down(0), down(2), up(0), up(2), down(0), up(0)));
    }

    @Test
    void bPlusCMutesAllTonesInsteadOfSelectingOne() {
        var bus = new FakeEventBus();
        new ToneSelector(bus);
        bus.send(down(1), down(2), up(2), up(1));
        assertEquals(1, bus.count(RequestMuteTones.class));
        assertEquals(0, bus.count(RequestSelectTone.class));
    }
}
