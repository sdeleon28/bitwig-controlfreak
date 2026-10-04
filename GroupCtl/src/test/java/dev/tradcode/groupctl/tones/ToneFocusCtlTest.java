package dev.tradcode.groupctl.tones;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigDevice;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;

class ToneFocusCtlTest {
    static final int GROUP = 2;
    static final int ORIG = 3;
    static final int A = 5;
    static final int B = 6;

    static BitwigTrack track(int id, String name, boolean isGroup, BitwigTrack... children) {
        var t = new BitwigTrack();
        t.id = id;
        t.name = name;
        t.isGroup = isGroup;
        t.children = new ArrayList<>(List.of(children));
        return t;
    }

    static BitwigDevice device(int id, String name) {
        var d = new BitwigDevice();
        d.id = id;
        d.name = name;
        d.exists = true;
        return d;
    }

    static FakeEventBus rig() {
        var bus = new FakeEventBus();
        new ToneFocusCtl(bus);
        var group = track(GROUP, "GTRS (3)", true,
            track(ORIG, "GTRS ORIG (13)", false),
            track(A, "A (1)", false),
            track(B, "B (2)", false));
        bus.send(new SchemaChanged(new ArrayList<>(List.of(group))));
        return bus;
    }

    static List<Integer> selectedTracks(FakeEventBus bus) {
        return bus.events.stream()
            .filter(RequestSelectTrack.class::isInstance)
            .map(e -> ((RequestSelectTrack) e).trackId())
            .toList();
    }

    static List<Event> grabs(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestSelectDevice || e instanceof DeviceGrabbed)
            .toList();
    }

    @Test
    void selectsTheGroupFirstAndTheToneTrackOnceTheGroupIsSelected() {
        var bus = rig();
        bus.send(new RequestSelectTone('B'));
        assertEquals(List.of(GROUP), selectedTracks(bus));
        bus.send(new BitwigTrackSelected(GROUP));
        assertEquals(List.of(GROUP, B), selectedTracks(bus));
    }

    @Test
    void skipsStraightToTheTrackWhenTheGroupIsAlreadySelected() {
        var bus = rig();
        bus.send(new BitwigTrackSelected(GROUP));
        bus.send(new RequestSelectTone('A'));
        assertEquals(List.of(A), selectedTracks(bus));
    }

    @Test
    void grabsTheAmpFromTheToneTracksDevices() {
        var bus = rig();
        bus.send(new RequestSelectTone('A'), new BitwigTrackSelected(GROUP), new BitwigTrackSelected(A));
        bus.send(new DevicesSchemaChanged(List.of(device(0, "Tuner"), device(1, "Archetype Gojira X"))));
        assertEquals(List.of(new RequestSelectDevice(1), new DeviceGrabbed("Archetype Gojira X")), grabs(bus));
    }

    @Test
    void grabsFromTheKnownDevicesWhenTheChainDidNotChange() {
        var bus = rig();
        bus.send(new DevicesSchemaChanged(List.of(device(2, "Archetype Gojira X"))));
        bus.send(new RequestSelectTone('B'), new BitwigTrackSelected(GROUP), new BitwigTrackSelected(B));
        assertEquals(List.of(new RequestSelectDevice(2), new DeviceGrabbed("Archetype Gojira X")), grabs(bus));
    }

    @Test
    void doesNotGrabAfterTheUserMovesToAnotherTrack() {
        var bus = rig();
        bus.send(new RequestSelectTone('A'), new BitwigTrackSelected(GROUP), new BitwigTrackSelected(A));
        bus.send(new BitwigTrackSelected(ORIG));
        bus.send(new DevicesSchemaChanged(List.of(device(0, "Archetype Gojira X"))));
        assertEquals(List.of(), grabs(bus));
    }

    @Test
    void tracksWithoutTheAmpAreSelectedWithoutGrabbing() {
        var bus = rig();
        bus.send(new RequestSelectTone('A'), new BitwigTrackSelected(GROUP), new BitwigTrackSelected(A));
        bus.send(new DevicesSchemaChanged(List.of(device(0, "Other Amp"))));
        assertEquals(List.of(), grabs(bus));
    }
}
