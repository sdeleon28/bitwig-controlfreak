package dev.tradcode.groupctl.events;

import java.util.ArrayList;

public class EventBus implements IEventBus {
    ArrayList<IEventBusSubscriber> subs = new ArrayList<IEventBusSubscriber>();

    public EventBus() {}

    public void subscribe(IEventBusSubscriber sub) {
      subs.add(sub);
    }

    public void send(Event event) {
      for (IEventBusSubscriber sub : subs)
          sub.on(event);
    }
}
