from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    SchemaChanged,
)

class Logger(EventBusSubscriber):
    enabled = True

    def __init__(self, bus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def on(self, event: Event) -> None:
        if self.enabled:
            print(event)
