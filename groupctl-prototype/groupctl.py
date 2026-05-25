from events import (
    EventBusSubscriber,
    EventBus,
    RequestSelectGroupEvent,
    PadClick,
    Event,
) 

class GroupCtl(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def notify(self, event: Event) -> None:
        match event:
            # let's make it match any for now
            case PadClick(n=n):
                self.bus.send(
                    RequestSelectGroupEvent(
                        # TODO: wire this up
                        track_id="1",
                        track_name="hardcoded",
                    )
                )
