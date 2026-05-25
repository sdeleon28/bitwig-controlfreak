from typing import List
from events import (
    EventBusSubscriber,
    EventBus,
    RequestSelectGroup,
    PadClick,
    Event,
    SchemaChanged,
    BwTrackSelected,
    BwTrack,
    LightPadUp,
) 


def flatten(tracks: List[BwTrack]):
    result = []
    for track in tracks:
        result.append(track)
        result.extend(flatten(track.children))
    return result


GLOBAL_TO_LOCAL = {
    29: 13, 30: 14, 31: 15, 32: 16,  # quadrant top row
    21:  9, 22: 10, 23: 11, 24: 12,
    13:  5, 14:  6, 15:  7, 16:  8,
     5:  1,  6:  2,  7:  3,  8:  4,  # quadrant bottom row
}


class GroupCtl(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self.tracks: List[BwTrack] = []

    # TODO: cache
    @property
    def groups(self):
        without_refs = [
            t for t in self.tracks
            if "top refs" not in t.name
        ]
        return [
            t for t in flatten(without_refs)
            if t.depth in [0, 1]
        ]

    def _track_id_to_position(self, track_id: str) -> int | None:
        for track in self.groups:
            if track.id == track_id:
                return track.position

    def _track_position_to_id(self, position: int):
        for track in self.groups:
            if track.position == position:
                return track.id

    def _track_position_to_name(self, position: int):
        for track in self.groups:
            if track.position == position:
                return track.name

    def _global_to_local_position(self, n: int) -> int | None:
        """
        Map a global launchpad pad index (1..64) to a local index (1..16)
        within the bottom-right quadrant. Returns None for pads outside it.
        """
        return GLOBAL_TO_LOCAL.get(n)

    def _local_to_global_position(self, n: int) -> int | None:
        local_to_global = dict([(b, a) for a, b in GLOBAL_TO_LOCAL.items()])
        return local_to_global.get(n)

    def on(self, event: Event) -> None:
        match event:
            case SchemaChanged(tracks=tracks):
                self.tracks = tracks
            case PadClick(n=n):
                pos = self._global_to_local_position(n)
                track_id = self._track_position_to_id(pos)
                track_name = self._track_position_to_name(pos)
                if pos and track_id and track_name:
                    self.bus.send(
                        RequestSelectGroup(
                            track_id=track_id,
                            track_name=track_name,
                        ),
                    )
            case BwTrackSelected(track_id=track_id):
                self.bus.send(
                    LightPadUp(
                        n=self._local_to_global_position(
                            self._track_id_to_position(track_id),
                        ),
                        color=108,
                    ),
                )
