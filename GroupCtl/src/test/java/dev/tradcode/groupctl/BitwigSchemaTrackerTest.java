package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

import java.util.ArrayList;

class FakeEventBus implements IEventBus {
    public ArrayList<Event> events = new ArrayList<Event>();
    ArrayList<IEventBusSubscriber> subs = new ArrayList<IEventBusSubscriber>();

    public FakeEventBus() {}

    public void subscribe(IEventBusSubscriber sub) {
        this.subs.add(sub);
    }

    public void send(Event event) {
        this.events.add(event);
        for (IEventBusSubscriber sub : this.subs) {
            sub.on(event);
        }
    }
}

class BitwigSchemaTrackerTest {

    @Test
    void testCanStructureSimpleGroup() {
        FakeEventBus bus = new FakeEventBus();
        BitwigSchemaTracker tracker = new BitwigSchemaTracker(null, bus);

        TrackCache group = new TrackCache();
        group.exists = true;
        group.id = 0;
        group.name = "Group 1 (1)";
        group.isGroup = true;
        group.mute = false;
        group.solo = false;
        group.trackType = "Group";
        group.channelIndex = 0;

        TrackCache inst1 = new TrackCache();
        inst1.exists = true;
        inst1.id = 1;
        inst1.name = "Inst 1 (1)";
        inst1.isGroup = false;
        inst1.mute = false;
        inst1.solo = true;
        inst1.trackType = "Instrument";
        inst1.channelIndex = 1;

        TrackCache audio2 = new TrackCache();
        audio2.exists = true;
        audio2.id = 2;
        audio2.name = "Audio 2 (2)";
        audio2.isGroup = false;
        audio2.mute = false;
        audio2.solo = false;
        audio2.trackType = "Audio";
        audio2.channelIndex = 2;

        tracker._setRawTrackCache(0, group);
        tracker._setRawTrackCache(1, inst1);
        tracker._setRawTrackCache(2, audio2);

        for (int i = 3; i < tracker.TRACKS_COUNT; i++) {
            TrackCache t = new TrackCache();
            t.exists = false;
            t.id = i;
            t.name = "";
            t.isGroup = false;
            t.mute = false;
            t.solo = false;
            t.trackType = "";
            t.channelIndex = i;
            tracker._setRawTrackCache(i, t);
        }

        tracker.flush();

        assertEquals(1, bus.events.size());
        String repr = bus.events.get(0).toString();

        String expected = (
            "========================================\n" +
            "Group 1 (1) | -- -> 1\n" +
            "    Inst 1 (1) | S- -> 1\n" +
            "    Audio 2 (2) | -- -> 2\n" +
            "========================================\n"
        );
        assertEquals(expected, repr);
    }

    @Test
    void testCanStructureCompleteFixture() {
        FakeEventBus bus = new FakeEventBus();
        BitwigSchemaTracker tracker = new BitwigSchemaTracker(null, bus);

        CompleteFixture.apply(tracker);
        tracker.flush();

        assertEquals(1, bus.events.size());
        String repr = bus.events.get(0).toString();

        String expected = (
            "========================================\n" +
            "top refs (13) | -- -> 13\n" +
            "    ref1 (1) | -- -> 1\n" +
            "    ref2 (2) | -- -> 2\n" +
            "    ref3 (3) | -- -> 3\n" +
            "    ref4 (4) | -- -> 4\n" +
            "top vox (14) | -- -> 14\n" +
            "    vox main (1) | -- -> 1\n" +
            "    vox main adlibs (2) | -- -> 2\n" +
            "    vox feat (3) | -- -> 3\n" +
            "    vox feat adlibs (4) | -- -> 4\n" +
            "    vox harm 1 (5) | -- -> 5\n" +
            "    vox harm 2 (6) | -- -> 6\n" +
            "    vox harm 3 (7) | -- -> 7\n" +
            "    vox harm 4 (8) | -- -> 8\n" +
            "top inst (15) | -- -> 15\n" +
            "    gtrs (1) | -- -> 1\n" +
            "        gtr main (1) | -- -> 1\n" +
            "        gtr lead (2) | -- -> 2\n" +
            "        gtr fx (3) | -- -> 3\n" +
            "        gtr synth (4) | -- -> 4\n" +
            "    bass (2) | -- -> 2\n" +
            "        bass di (1) | -- -> 1\n" +
            "        bass lo (2) | -- -> 2\n" +
            "        bass hi (3) | -- -> 3\n" +
            "        bass dist (4) | -- -> 4\n" +
            "        bass synth (5) | -- -> 5\n" +
            "    synth (3) | -- -> 3\n" +
            "        808 (1) | -- -> 1\n" +
            "        lead (2) | -- -> 2\n" +
            "        pad (2) | -- -> 2\n" +
            "    drms (4) | -- -> 4\n" +
            "        okw (1) | -- -> 1\n" +
            "        trap machine (2) | -- -> 2\n" +
            "        fx kit (3) | -- -> 3\n" +
            "    casuarinas (12) | -- -> 12\n" +
            "        handpan (1) | -- -> 1\n" +
            "        cuenco (2) | -- -> 2\n" +
            "        ribbit (3) | -- -> 3\n" +
            "        oink (4) | -- -> 4\n" +
            "========================================\n"
        );
        assertEquals(expected, repr);
    }
}
