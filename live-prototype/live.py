from abc import ABC
from enum import IntEnum
from typing import Protocol, List
import time
import mido
from dataclasses import dataclass
import re
from copy import deepcopy

@dataclass
class Track:
    name: str
    mute: bool = False
    solo: bool = False
    rec: bool = False
    sel: bool = False
    color: int = 0


@dataclass
class Marker:
    name: str
    position: int  # TODO
    color: int = 0


@dataclass
class MarkerSet:
    name: str
    markers: List[Marker]


class Bitwig:
    """
    Bitwig fake that we use to simulate real controller script interaction.
    This will be replaced with a similar abstraction that shields us from
    raw Bitwig APIs and gives us what we need from it.
    """

    def __init__(self):
        # NOTE: these should be bitwig colors and we'll need a translation layer
        self.tracks = [
            Track(name="gtr live (1)", color=72),
            Track(name="vox (9)", color=34),
            Track(name="drms (10)", color=87),
            Track(name="bass (11)", color=79),
            Track(name="gtrs (12)", color=72),
        ]
        self.markers = [
            Marker(name="{ amy", position=0, color=0),
            Marker(name="intro", position=0, color=0),
            Marker(name="verso1", position=0, color=0),
            Marker(name="estrib1", position=0, color=0),
            Marker(name="verso2", position=0, color=0),
            Marker(name="estrib2", position=0, color=0),
            Marker(name="}", position=0, color=0),
            Marker(name="{ pentium", position=0, color=0),
            Marker(name="verso1", position=0, color=0),
            Marker(name="estrib1", position=0, color=0),
            Marker(name="verso2", position=0, color=0),
            Marker(name="estrib2", position=0, color=0),
            Marker(name="solo", position=0, color=0),
            Marker(name="estrib3", position=0, color=0),
            Marker(name="}", position=0, color=0),
        ]

    def get_tracks(self):
        out = {}
        for track in self.tracks:
            match = re.match(".*\\((.*)\\)", track.name)
            if match:
                out[int(match.group(1))] = track
        return [out.get(i, None) for i in range(1, 17)]

    def get_marker_sets(self) -> List[MarkerSet]:
        """
        Goes through the list of cue markers reported by Bitwig and turns them
        into a more useful data structure using conventions to start and end
        songs for a live session.
        """
        marker_sets: List[MarkerSet] = []
        current_markers = []
        for m in self.markers:
            if m.name.startswith("{"):
                current_markers = []
                current_markers.append(m)
            elif m.name.startswith("}"):
                current_markers.append(m)
                marker_sets.append(
                    MarkerSet(
                        name=current_markers[0].name.split("{ ")[1],
                        markers=(current_markers),
                    )
                )
            else:
                current_markers.append(m)
        return marker_sets
    
    def growl(self, msg):
        print("=============")
        print("GRRRROWL: ", msg)
        print("=============")


class Quadrant(ABC):
    x_offset: int
    y_offset: int

    def __init__(self, bitwig: "Bitwig", launchpad: "Launchpad"):
        self.bitwig = bitwig
        self.launchpad = launchpad

    def paint_pad(self, n, color):
        rest = (n % 4)
        row = (n // 4)
        row += self.y_offset
        if rest:
            note = (8 * row) + rest
        else:
            note = (8 * (row - 1)) + 4
        note += self.x_offset
        self.launchpad.paint_pad(note, color)

    def paint(self):
        tracks = self.bitwig.get_tracks()
        for i, t in enumerate(tracks, start=1):
            if t:
                self.paint_pad(i, t.color)



class RecQuadrant(Quadrant):
    x_offset = 0
    y_offset = 0


class SoloQuadrant(Quadrant):
    x_offset = 4
    y_offset = 0


class MuteQuadrant(Quadrant):
    x_offset = 4
    y_offset = 4



class SelectQuadrant(Quadrant):
    x_offset = 0
    y_offset = 4


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
class PadClick:
    note: int

@dataclass
class PadHold:
    note: int

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

LaunchpadEvent = (
    PadClick | PadHold
    | TopButtonClick | TopButtonHold
    | SideButtonClick | SideButtonHold
)

HOLD_THRESHOLD = 0.4

class LaunchpadSubscriber(Protocol):
    def on_launchpad_event(self, event: LaunchpadEvent) -> None: ...


class LaunchpadLayout:
    pass


class _GestureState:
    def __init__(self):
        self.down_at: float | None = None
        self.hold_emitted: bool = False

class Launchpad:
    def __init__(self):
        self.port = mido.open_output('Launchpad MK2 12')
        self.input = mido.open_input('Launchpad MK2 12')
        self._subscribers: list[LaunchpadSubscriber] = []
        self._gestures: dict[tuple[str, int], _GestureState] = {}

    def subscribe(self, subscriber: LaunchpadSubscriber):
        self._subscribers.append(subscriber)

    def _emit(self, event: LaunchpadEvent):
        for sub in self._subscribers:
            sub.on_launchpad_event(event)

    def _gs(self, key: tuple[str, int]) -> _GestureState:
        if key not in self._gestures:
            self._gestures[key] = _GestureState()
        return self._gestures[key]

    def _make_event(self, key: tuple[str, int], gesture: str) -> LaunchpadEvent:
        tag, ident = key
        if tag == 'top':
            btn = TopButton(ident)
            return TopButtonClick(btn) if gesture == 'click' else TopButtonHold(btn)
        elif tag == 'side':
            btn = SideButton(ident)
            return SideButtonClick(btn) if gesture == 'click' else SideButtonHold(btn)
        else:
            return PadClick(ident) if gesture == 'click' else PadHold(ident)

    def _on_press(self, key: tuple[str, int]):
        gs = self._gs(key)
        gs.down_at = time.monotonic()
        gs.hold_emitted = False

    def _on_release(self, key: tuple[str, int]):
        gs = self._gs(key)
        if gs.hold_emitted:
            gs.down_at = None
            return
        gs.down_at = None
        self._emit(self._make_event(key, 'click'))

    def poll(self):
        now = time.monotonic()
        for msg in self.input.iter_pending():
            if msg.type == 'control_change':
                try:
                    TopButton(msg.control)
                    key = ('top', msg.control)
                    if msg.value > 0:
                        self._on_press(key)
                    else:
                        self._on_release(key)
                except ValueError:
                    pass
            elif msg.type == 'note_on':
                try:
                    SideButton(msg.note)
                    key = ('side', msg.note)
                except ValueError:
                    key = ('pad', msg.note)
                if msg.velocity > 0:
                    self._on_press(key)
                else:
                    self._on_release(key)

        for key, gs in self._gestures.items():
            if gs.down_at is not None and not gs.hold_emitted and now - gs.down_at >= HOLD_THRESHOLD:
                gs.hold_emitted = True
                self._emit(self._make_event(key, 'hold'))

    def clear(self):
        for i in range(128):
            self.port.send(mido.Message('note_on', note=i, velocity=0))
        for j in range(TopButton.up, TopButton.mixer + 1):
            self.port.send(mido.Message('control_change', control=j, value=0))

    def clear_keep_top(self):
        for i in range(128):
            self.port.send(mido.Message('note_on', note=i, velocity=0))

    def paint_pad(self, n, color):
        rest = (n % 8)
        row = (n // 8) + 1
        if rest:
            note = (10 * row) + rest
        else:
            note = (10 * (row - 1)) + 8
        self.port.send(mido.Message('note_on', note=note, velocity=color))

    def paint_top_button(self, cc: TopButton, color):
        self.port.send(mido.Message('control_change', control=cc, value=color))

    def paint_side_button(self, note: SideButton, color):
        self.port.send(mido.Message('note_on', note=note, velocity=color))


class LaunchpadPage(Protocol):
    def paint(self):
        ...

class LaunchpadPager:
    def __init__(self, l: "Launchpad", pages: List[LaunchpadPage]):
        self.launchpad = l
        self.pages = pages
        self.current_page_i = 0
        self.current_page = self.pages[self.current_page_i]

    def previous_page(self):
        new_i = self.current_page_i - 1
        if new_i < 0:
            return
        self.current_page_i = new_i
        self.current_page = self.pages[new_i]
        self.paint()

    def next_page(self):
        new_i = self.current_page_i + 1
        if new_i >= len(self.pages):
            return
        self.current_page_i = new_i
        self.current_page = self.pages[new_i]
        self.paint()

    def paint(self):
        prev_page_enabled = self.current_page_i - 1 >= 0
        if prev_page_enabled:
            self.launchpad.paint_top_button(TopButton.up, color=34)
        else:
            self.launchpad.paint_top_button(TopButton.up, color=0)
        next_page_enabled = self.current_page_i + 1 < len(self.pages)
        if next_page_enabled:
            self.launchpad.paint_top_button(TopButton.down, color=34)
        else:
            self.launchpad.paint_top_button(TopButton.down, color=0)
        self.current_page.paint()

    def on_launchpad_event(self, event: LaunchpadEvent):
        match event:
            case TopButtonClick(button=TopButton.up):
                self.previous_page()
            case TopButtonClick(button=TopButton.down):
                self.next_page()


class ControlPage:
    def __init__(self, bw: "Bitwig", l: "Launchpad"):
        self.launchpad = l
        self.rec_q = RecQuadrant(bw, l)
        self.solo_q = SoloQuadrant(bw, l)
        self.mute_q = MuteQuadrant(bw, l)
        self.sel_q = SelectQuadrant(bw, l)

    def paint(self):
        self.launchpad.clear_keep_top()
        self.rec_q.paint()
        self.solo_q.paint()
        self.mute_q.paint()
        self.sel_q.paint()

    def on_launchpad_event(self, event: LaunchpadEvent):
        match event:
            case TopButtonClick(button=tb):
                print("TopButton click:", tb)
            case TopButtonHold(button=tb):
                print("TopButton hold:", tb)
            case SideButtonClick(button=sb):
                print("SideButton click:", sb)
            case SideButtonHold(button=sb):
                print("SideButton hold:", sb)
            case PadClick(note=note):
                print("Pad click:", note)
            case PadHold(note=note):
                print("Pad hold:", note)


def main():
    bw = Bitwig()
    l = Launchpad()
    l.clear()
    cp = ControlPage(bw, l)
    l.subscribe(cp)
    pager = LaunchpadPager(l, [
        cp,
        cp,
    ])
    l.subscribe(pager)
    pager.paint()
    print("Listening for pad presses... (Ctrl+C to quit)")
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == "__main__":
    main()
