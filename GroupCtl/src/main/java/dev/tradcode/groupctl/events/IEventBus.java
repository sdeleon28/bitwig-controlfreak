package dev.tradcode.groupctl.events;

public interface IEventBus {
    public void subscribe(IEventBusSubscriber sub);
    public void send(Event event);
}
