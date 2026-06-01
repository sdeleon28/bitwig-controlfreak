package dev.tradcode.groupctl;

import java.util.ArrayList;

public class EventBus {
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
