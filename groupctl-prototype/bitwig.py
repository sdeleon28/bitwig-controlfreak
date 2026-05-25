from typing import List, Literal
from events import (
    EventBusSubscriber,
    BwTrackSelectedEvent,
    EventBus,
    RequestSelectGroupEvent,
)

class Bitwig(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)

    def select_track(self, track_id):
        print("# select_track: ", track_id)
        # this is what the API should return
        self.bus.send(
            BwTrackSelectedEvent(
                track_id=track_id,
            ),
        )

    def on(self, event) -> None:
        match event:
            case RequestSelectGroupEvent(track_id=track_id):
                self.select_track(track_id)
