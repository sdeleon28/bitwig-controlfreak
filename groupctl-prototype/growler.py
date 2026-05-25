from events import (
    EventBus,
    EventBusSubscriber,
    RequestSelectGroup,
    PadClick,
)

class Growler(EventBusSubscriber):
    enabled = False

    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def on(self, event) -> None:
        match event:
            case RequestSelectGroup(track_name=track_name):
                self.growl(f"[GROUP] {track_name}")
            case PadClick(n=pad_n):
                self.growl(f"[CLICKED PAD] {pad_n}")

    def growl(self, message) -> None:
        if self.enabled:
            print(message)
