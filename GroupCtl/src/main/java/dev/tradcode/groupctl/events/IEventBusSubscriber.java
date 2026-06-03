package dev.tradcode.groupctl.events;

public interface IEventBusSubscriber {
    public void on(Event event);
}
