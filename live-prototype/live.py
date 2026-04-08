from abc import ABC
from enum import IntEnum
from typing import Generic, Protocol, List, TypeVar
import time
import mido
from dataclasses import dataclass
import re

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
    length: int = 1
    """
    The length in bars. In the real app this needs to be calculated using a 
    similar calculation to what's currently being used for the ProjectExplorer
    of the "Launchpad + Twister" controller script.
    """

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


HOLD_THRESHOLD = 0.4


@dataclass
class MarkerSet:
    name: str
    markers: List[Marker]


@dataclass
class TracksUpdated:
    pass


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


LaunchpadEvent = (
    PadClick | PadHold
    | TopButtonClick | TopButtonHold
    | SideButtonClick | SideButtonHold
)

class LaunchpadSubscriber(Protocol):
    def on_launchpad_event(self, event: LaunchpadEvent) -> None: ...


BitwigEvent = (
    TracksUpdated
)

class BitwigSubscriber(Protocol):
    def on_bitwig_event(self, event: BitwigEvent) -> None: ...


class Bitwig:
    """
    Bitwig fake that we use to simulate real controller script interaction.
    This will be replaced with a similar abstraction that shields us from
    raw Bitwig APIs and gives us what we need from it.
    """

    def __init__(self):
        # NOTE: these should be bitwig colors and we'll need a translation layer
        self._tracks = [
            Track(name="gtr live (1)", color=72),
            Track(name="vox (9)", color=34),
            Track(name="drms (10)", color=87),
            Track(name="bass (11)", color=79),
            Track(name="gtrs (12)", color=72),
        ]
        self._markers = [
            Marker(name="{ amy", length=8, position=0, color=70),
            Marker(name="intro", length=8, position=0, color=49),
            Marker(name="verso1", length=8, position=0, color=87),
            Marker(name="estrib1", length=8, position=0, color=72),
            Marker(name="verso2", length=8, position=0, color=87),
            Marker(name="estrib2", length=8, position=0, color=72),
            Marker(name="}", length=1, position=0, color=70),
            Marker(name="{ pentium", length=8, position=0, color=70),
            Marker(name="verso1", length=8, position=0, color=87),
            Marker(name="estrib1", length=8, position=0, color=72),
            Marker(name="verso2", length=8, position=0, color=87),
            Marker(name="estrib2", length=8, position=0, color=72),
            Marker(name="solo", length=8, position=0, color=109),
            Marker(name="estrib3", length=8, position=0, color=72),
            Marker(name="}", length=1, position=0, color=70),
        ]
        self._subscribers: list[BitwigSubscriber] = []

    def subscribe(self, subscriber: BitwigSubscriber):
        self._subscribers.append(subscriber)

    def _emit(self, event: BitwigEvent):
        for sub in self._subscribers:
            sub.on_bitwig_event(event)

    def toggle_rec(self, track_n):
        new_tracks = []
        for t in self._tracks:
            if f"({ track_n })" in t.name:
                t.rec = not t.rec
            new_tracks.append(t)
        self._tracks = new_tracks
        self._emit(TracksUpdated())

    def toggle_solo(self, track_n):
        new_tracks = []
        for t in self._tracks:
            if f"({ track_n })" in t.name:
                t.solo = not t.solo
            new_tracks.append(t)
        self._tracks = new_tracks
        self._emit(TracksUpdated())

    def toggle_mute(self, track_n):
        new_tracks = []
        for t in self._tracks:
            if f"({ track_n })" in t.name:
                t.mute = not t.mute
            new_tracks.append(t)
        self._tracks = new_tracks
        self._emit(TracksUpdated())

    def get_tracks(self):
        out = {}
        for track in self._tracks:
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
        for m in self._markers:
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


class Quadrant(ABC, BitwigSubscriber, LaunchpadSubscriber):
    x_offset: int
    y_offset: int

    def __init__(self, bitwig: "Bitwig", launchpad: "Launchpad"):
        self.bitwig = bitwig
        self.bitwig.subscribe(self)
        self.launchpad = launchpad
        self.launchpad.subscribe(self)

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

    def _global_to_local(self, global_n: int) -> int | None:
        """Map a 1-64 launchpad pad index to this quadrant's 1-16 local
        index, or None if the pad is outside this quadrant's region."""
        row = (global_n - 1) // 8  # 0 (bottom) .. 7 (top)
        col = (global_n - 1) % 8   # 0 (left)   .. 7 (right)
        if not (self.y_offset <= row < self.y_offset + 4):
            return None
        if not (self.x_offset <= col < self.x_offset + 4):
            return None
        local_row = row - self.y_offset
        local_col = col - self.x_offset
        return local_row * 4 + local_col + 1

    def paint(self):
        ...

    def on_bitwig_event(self, event: BitwigEvent) -> None:
        match event:
            case TracksUpdated():
                self.paint()

    def on_launchpad_event(self, event: LaunchpadEvent) -> None:
        match event:
            case PadClick(n):
                local = self._global_to_local(n)
                if local is not None:
                    self.on_pad_click(local)

    def on_pad_click(self, local_n: int) -> None:
        ...


class RecQuadrant(Quadrant):
    x_offset = 0
    y_offset = 0

    def paint(self):
        tracks = self.bitwig.get_tracks()
        for i, t in enumerate(tracks, start=1):
            if t:
                self.paint_pad(i, 95 if t.rec else t.color)

    def on_pad_click(self, local_n: int) -> None:
        self.bitwig.toggle_rec(local_n)


class SoloQuadrant(Quadrant):
    x_offset = 4
    y_offset = 0

    def paint(self):
        tracks = self.bitwig.get_tracks()
        for i, t in enumerate(tracks, start=1):
            if t:
                self.paint_pad(i, 109 if t.solo else t.color)

    def on_pad_click(self, local_n: int) -> None:
        self.bitwig.toggle_solo(local_n)

class MuteQuadrant(Quadrant):
    x_offset = 4
    y_offset = 4

    def paint(self):
        tracks = self.bitwig.get_tracks()
        for i, t in enumerate(tracks, start=1):
            if t:
                self.paint_pad(i, 108 if t.mute else t.color)

    def on_pad_click(self, local_n: int) -> None:
        self.bitwig.toggle_mute(local_n)


class SelectQuadrant(Quadrant):
    x_offset = 0
    y_offset = 4

    def paint(self):
        tracks = self.bitwig.get_tracks()
        for i, t in enumerate(tracks, start=1):
            if t:
                self.paint_pad(i, t.color)


def _mk2_note_to_pad_n(note: int) -> int:
    """Convert a Launchpad MK2 grid note (11-88) to a 1-64 pad index
    (bottom-to-top, left-to-right)."""
    row = note // 10  # 1 (bottom) .. 8 (top)
    col = note % 10   # 1 (left) .. 8 (right)
    return (row - 1) * 8 + col


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
                    key = ('pad', _mk2_note_to_pad_n(msg.note))
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


class LaunchpadPage(LaunchpadSubscriber):
    def paint(self):
        ...

T = TypeVar('T')

class Pager(Generic[T]):
    prev_button: TopButton
    next_button: TopButton

    def __init__(self, launchpad: "Launchpad", items: List[T]):
        self.launchpad = launchpad
        self.items = items
        self._index = 0

    @property
    def current(self) -> T:
        return self.items[self._index]

    def on_page_change(self) -> None:
        pass

    def previous(self):
        if self._index <= 0:
            return
        self._index -= 1
        self.paint_buttons()
        self.on_page_change()

    def next(self):
        if self._index >= len(self.items) - 1:
            return
        self._index += 1
        self.paint_buttons()
        self.on_page_change()

    def paint_buttons(self):
        self.launchpad.paint_top_button(
            self.prev_button, 34 if self._index > 0 else 0
        )
        self.launchpad.paint_top_button(
            self.next_button, 34 if self._index < len(self.items) - 1 else 0
        )

    def on_launchpad_event(self, event: LaunchpadEvent):
        match event:
            case TopButtonClick(button=b) if b == self.prev_button:
                self.previous()
            case TopButtonClick(button=b) if b == self.next_button:
                self.next()


class MainPager(Pager[LaunchpadPage]):
    prev_button = TopButton.up
    next_button = TopButton.down

    def on_page_change(self):
        self.current.paint()

    def paint(self):
        self.launchpad.clear_keep_top()
        self.paint_buttons()
        self.current.paint()


class MarkerSetPager(Pager[MarkerSet]):
    prev_button = TopButton.left
    next_button = TopButton.right

    def __init__(self, page: "ProjectExplorerPage"):
        super().__init__(page.launchpad, page.bitwig.get_marker_sets())
        self.page = page

    def on_page_change(self):
        self.page.paint()


class ControlPage(LaunchpadPage):
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
        # match event:
        #     case TopButtonClick(button=tb):
        #         print("TopButton click:", tb)
        #     case TopButtonHold(button=tb):
        #         print("TopButton hold:", tb)
        #     case SideButtonClick(button=sb):
        #         print("SideButton click:", sb)
        #     case SideButtonHold(button=sb):
        #         print("SideButton hold:", sb)
        #     case PadClick(n=n):
        #         print("Pad click:", n)
        #     case PadHold(n=n):
        #         print("Pad hold:", n)
        pass

REVERSED_MATRIX_INDICES = list(range(57, 65)) \
    + list(range(49, 57)) \
    + list(range(41, 49)) \
    + list(range(33, 41)) \
    + list(range(25, 33)) \
    + list(range(17, 25)) \
    + list(range(9, 17)) \
    + list(range(1, 9))


class ProjectExplorerPage(LaunchpadPage):
    def __init__(self, bw: "Bitwig", l: "Launchpad"):
        self.bitwig = bw
        self.launchpad = l
        self.marker_set_pager = MarkerSetPager(self)

    def _bitwig_to_launchpad_color(self, c):
        # here's where we would perform the translation
        return c

    def paint(self):
        self.bitwig.growl(self.marker_set_pager.current.name)
        self.launchpad.clear_keep_top()
        self.marker_set_pager.paint_buttons()
        i = 0
        for m in self.marker_set_pager.current.markers:
            for _ in range(m.length):
                self.launchpad.paint_pad(
                    REVERSED_MATRIX_INDICES[i],
                    self._bitwig_to_launchpad_color(m.color)
                )
                i += 1

    def on_launchpad_event(self, event: LaunchpadEvent):
        self.marker_set_pager.on_launchpad_event(event)


def main():
    bw = Bitwig()
    l = Launchpad()
    l.clear()
    cp = ControlPage(bw, l)
    l.subscribe(cp)
    pep = ProjectExplorerPage(bw, l)
    l.subscribe(pep)
    main_pager = MainPager(l, [cp, pep])
    l.subscribe(main_pager)
    main_pager.paint()
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == "__main__":
    main()
