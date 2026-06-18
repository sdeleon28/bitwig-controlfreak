package dev.tradcode.groupctl.editor;

import java.util.ArrayList;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

class FakeEventBus implements IEventBus {
    final ArrayList<Event> events = new ArrayList<>();
    private final ArrayList<IEventBusSubscriber> subs = new ArrayList<>();

    public void subscribe(IEventBusSubscriber sub) {
        this.subs.add(sub);
    }

    public void send(Event... toSend) {
        for (var event : toSend) {
            this.events.add(event);
            for (IEventBusSubscriber sub : this.subs)
                sub.on(event);
        }
    }

    <T extends Event> T last(Class<T> type) {
        for (int i = events.size() - 1; i >= 0; i--)
            if (type.isInstance(events.get(i)))
                return type.cast(events.get(i));
        return null;
    }

    <T extends Event> long count(Class<T> type) {
        return events.stream().filter(type::isInstance).count();
    }
}
