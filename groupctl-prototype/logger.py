from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    SchemaChangedEvent,
)

class Logger(EventBusSubscriber):
    enabled = True

    def __init__(self, bus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def notify(self, event: Event) -> None:
        if self.enabled:
            print(event)
