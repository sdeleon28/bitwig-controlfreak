from typing import List, Literal, Protocol
from enum import IntEnum
from dataclasses import dataclass
from colors import BwColor, LaunchpadColor


@dataclass
class BwTrack:
    id: str
    name: str
    position: int
    color: BwColor
    depth: Literal[0] | Literal[1] | Literal[2]
    children: List["BwTrack"]


@dataclass
class SchemaChanged:
    tracks: List[BwTrack]


TrackParam = (
      Literal["volume"] 
    | Literal["pan"]
    | Literal["mute"]
    | Literal["solo"]
)


@dataclass
class TrackParamChanged:
    track_id: str
    param: TrackParam
    new_value: int


@dataclass
class DeviceSelected:
    device_id: str


@dataclass
class RequestSelectGroupEvent:
    track_id: str
    track_name: str


# BEGIN: Launchpad
class TopButton(IntEnum):
    up = 104
    down = 105
    left = 106
    right = 107
    session = 108
    user_1 = 109
    user_2 = 110
    mixer = 111


class SideButton(IntEnum):
    volume = 89
    pan = 79
    send_a = 69
    send_b = 59
    stop = 49
    mute = 39
    solo = 29
    record_arm = 19

@dataclass
class LightPadUp:
    n: int
    color: LaunchpadColor


@dataclass
class PadClick:
    n: int


@dataclass
class PadHold:
    n: int


@dataclass
class TopButtonClick:
    button: TopButton


@dataclass
class TopButtonHold:
    button: TopButton


@dataclass
class SideButtonClick:
    button: SideButton


@dataclass
class SideButtonHold:
    button: SideButton
# END: Launchpad


LaunchpadEvent = (
      PadClick        | PadHold
    | TopButtonClick  | TopButtonHold
    | SideButtonClick | SideButtonHold
)

@dataclass
class BwTrackSelectedEvent:
    track_id: str


@dataclass
class BwDeviceSelectedEvent:
    track_id: str


BwEvent = (
    BwTrackSelectedEvent
)


Event = (
      LaunchpadEvent
    | BwEvent 
    | SchemaChanged 
    | TrackParamChanged
    | DeviceSelected
    | RequestSelectGroupEvent
)


class EventBusSubscriber(Protocol):
    def on(self, event) -> None:
        ...


class EventBus:
    def __init__(self) -> None:
        self.events: List[Event] = []
        self._subscribers: List[EventBusSubscriber] = []

    def subscribe(self, subject):
        self._subscribers.append(subject)
        # TODO: should i do initial fanout?
        for e in self.get_all_events():
            subject.on(e)

    def _fanout(self, event: Event):
        for s in self._subscribers:
            s.on(event)

    def send(self, *evs: List[Event]) -> None:
        for event in evs:
            self.events.append(event)
            self._fanout(event)

    def get_all_events(self) -> List[Event]:
        return list(self.events)

