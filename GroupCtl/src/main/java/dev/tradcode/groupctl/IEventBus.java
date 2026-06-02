package dev.tradcode.groupctl;

interface IEventBus {
    public void subscribe(IEventBusSubscriber sub);
    public void send(Event event);
}
