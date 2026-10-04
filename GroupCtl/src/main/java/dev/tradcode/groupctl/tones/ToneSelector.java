package dev.tradcode.groupctl.tones;

import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.tones.events.FootswitchPressed;
import dev.tradcode.groupctl.tones.events.FootswitchReleased;
import dev.tradcode.groupctl.tones.events.RequestMuteTones;
import dev.tradcode.groupctl.tones.events.RequestSelectTone;

/**
 * E and F have no switch of their own: the pedal prints them between A+B and
 * C+D, which you press together. The tone is decided once every switch is
 * released, from all the switches that were down during the gesture.
 * B+C mutes every tone.
 */
public class ToneSelector implements IEventBusSubscriber {
    static final Map<Set<Integer>, Character> TONES = Map.of(
        Set.of(0), 'A',
        Set.of(1), 'B',
        Set.of(2), 'C',
        Set.of(3), 'D',
        Set.of(0, 1), 'E',
        Set.of(2, 3), 'F'
    );
    static final Set<Integer> MUTE_ALL = Set.of(1, 2);

    IEventBus bus;
    Set<Integer> held = new TreeSet<>();
    Set<Integer> gesture = new TreeSet<>();

    public ToneSelector(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case FootswitchPressed e -> {
                this.held.add(e.note());
                this.gesture.add(e.note());
            }
            case FootswitchReleased e -> {
                this.held.remove(e.note());
                if (!this.held.isEmpty())
                    return;
                Character tone = TONES.get(this.gesture);
                boolean muteAll = this.gesture.equals(MUTE_ALL);
                this.gesture = new TreeSet<>();
                if (muteAll)
                    this.bus.send(new RequestMuteTones());
                else if (tone != null)
                    this.bus.send(new RequestSelectTone(tone));
            }
            default -> { }
        }
    }
}
