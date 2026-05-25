from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    SchemaChanged,
)

class Logger(EventBusSubscriber):
    enabled = True

    def __init__(self, bus, path: str = "out.log") -> None:
        self.bus = bus
        self._file = open(path, "a", buffering=1)  # line-buffered
        self.bus.subscribe(self)

    def on(self, event: Event) -> None:
        if self.enabled:
            print(event, file=self._file)
