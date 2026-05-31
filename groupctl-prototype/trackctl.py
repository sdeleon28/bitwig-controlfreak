from typing import List
from colors import BITIWG_TO_LAUNCHPAD_COLORS, BwColor, LaunchpadColor, TwisterColor
from events import (
    BlinkPad,
    BwTrack,
    BwTrackSelected,
    Event,
    EventBus,
    EventBusSubscriber,
    LightPadUp,
    PageSelected,
    SchemaChanged,
)


def flatten(tracks: List[BwTrack]):
    result = []
    for track in tracks:
        result.append(track)
        result.extend(flatten(track.children))
    return result


GLOBAL_TO_LOCAL = {
    25: 13, 26: 14, 27: 15, 28: 16,  # quadrant top row
    17:  9, 18: 10, 19: 11, 20: 12,
     9:  5, 10:  6, 11:  7, 12:  8,
     1:  1,  2:  2,  3:  3,  4:  4,  # quadrant bottom row
}


class TrackCtl(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self.tracks: List[BwTrack] = []
        self.selected_track_id: str | None = None
        self.page_active: bool = True

    # TODO: cache
    @property
    def groups(self) -> List[BwTrack]:
        without_refs = [
            t for t in self.tracks
            if "top refs" not in t.name
        ]
        return [
            t for t in flatten(without_refs)
            if t.depth in [0, 1]
        ]

    @property
    def tracks_in_selected_group(self) -> List[BwTrack]:
        group_burrito = [
            g for g in self.groups
            if g.id == self.selected_track_id
        ]
        if group_burrito:
            return group_burrito[0].children
        return []
        
    def _get_track_by_id(self, track_id: str) -> BwTrack | None:
        for track in self.tracks:
            if track.id == track_id:
                return track
        return None

    def _local_to_global_position(self, n: int) -> int | None:
        local_to_global = dict([(b, a) for a, b in GLOBAL_TO_LOCAL.items()])
        return local_to_global.get(n)

    def _bw_to_launchpad_color(self, color: BwColor) -> LaunchpadColor | None:
        return BITIWG_TO_LAUNCHPAD_COLORS.get(color)

    def _clear_quadrant(self) -> None:
        for i in range(1, 17):
            pos = self._local_to_global_position(i)
            if not pos:
                continue
            self.bus.send(
                LightPadUp(
                    n=pos,
                    color=0,
                )
            )

    def _paint(self) -> None:
        if not self.page_active:
            return
        tracks = self.tracks_in_selected_group
        self._clear_quadrant()
        for t in tracks:
            position = self._local_to_global_position(t.position)
            color = self._bw_to_launchpad_color(t.color)
            if position and color:
                event_cls = (
                    BlinkPad
                    if t.id == self.selected_track_id
                    else LightPadUp
                )
                self.bus.send(event_cls(n=position, color=color))

    def _is_group(self, track_id: str) -> bool:
        gids = [g.id for g in self.groups]
        return track_id in gids

    def on(self, event: Event) -> None:
        match event:
            case SchemaChanged(tracks=tracks):
                self.tracks = tracks
                self._paint()
            case BwTrackSelected(track_id=track_id):
                self.selected_track_id = track_id
                if self._is_group(track_id):
                    self._paint()
            case PageSelected(n=n):
                self.page_active = n == 0
                self._paint()
