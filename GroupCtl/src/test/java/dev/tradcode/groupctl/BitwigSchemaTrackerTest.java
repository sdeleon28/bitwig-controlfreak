package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

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
}
