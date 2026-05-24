from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    SchemaChangedEvent,
)

class Logger(EventBusSubscriber):
    def __init__(self, bus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def notify(self, event: Event) -> None:
        match event:
            case SchemaChangedEvent(tracks=tracks):
                print(f">>> SchemaChangedEvent: {tracks}")
