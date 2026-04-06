from abc import ABC
from enum import IntEnum
from typing import Protocol
import mido
from palette import palette
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


class Bitwig:
    def __init__(self):
        # NOTE: these should be bitwig colors and we'll need a translation layer
        self.tracks = [
            Track(name="gtr live (1)", color=72),
            Track(name="vox (9)", color=34),
            Track(name="drms (10)", color=87),
            Track(name="bass (11)", color=79),
            Track(name="gtrs (12)", color=72),
        ]

    def get_tracks(self):
        out = {}
        for track in self.tracks:
            match = re.match(".*\\((.*)\\)", track.name)
            if match:
                out[int(match.group(1))] = track
        return [out.get(i, None) for i in range(1, 17)]


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
class PadPress:
    note: int
    velocity: int

@dataclass
class TopButtonPress:
    button: TopButton
    value: int

@dataclass
class SideButtonPress:
    button: SideButton
    velocity: int

LaunchpadEvent = PadPress | TopButtonPress | SideButtonPress

class LaunchpadSubscriber(Protocol):
    def on_launchpad_event(self, event: LaunchpadEvent) -> None: ...


class LaunchpadLayout:
    pass


class Launchpad:
    def __init__(self):
        self.port = mido.open_output('Launchpad MK2 12')
        self.input = mido.open_input('Launchpad MK2 12')
        self._subscribers: list[LaunchpadSubscriber] = []

    def subscribe(self, subscriber: LaunchpadSubscriber):
        self._subscribers.append(subscriber)

    def poll(self):
        for msg in self.input.iter_pending():
            event: LaunchpadEvent | None = None
            if msg.type == 'control_change':
                try:
                    event = TopButtonPress(TopButton(msg.control), msg.value)
                except ValueError:
                    pass
            elif msg.type == 'note_on':
                try:
                    event = SideButtonPress(SideButton(msg.note), msg.velocity)
                except ValueError:
                    event = PadPress(msg.note, msg.velocity)
            if event:
                for sub in self._subscribers:
                    sub.on_launchpad_event(event)

    def clear(self):
        for i in range(128):
            self.port.send(mido.Message('note_on', note=i, velocity=0))
        for j in range(TopButton.up, TopButton.mixer + 1):
            self.port.send(mido.Message('control_change', control=j, value=0))

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


class ControlPage:
    def __init__(self, bw: "Bitwig", l: "Launchpad"):
        self.rec_q = RecQuadrant(bw, l)
        self.solo_q = SoloQuadrant(bw, l)
        self.mute_q = MuteQuadrant(bw, l)
        self.sel_q = SelectQuadrant(bw, l)

    def paint(self):
        self.rec_q.paint()
        self.solo_q.paint()
        self.mute_q.paint()
        self.sel_q.paint()

    def on_launchpad_event(self, event: LaunchpadEvent):
        match event:
            case TopButtonPress(button=tb):
                print("TopButton pressed:", tb)
            case SideButtonPress(button=sb):
                print("SideButton pressed:", sb)
            case PadPress(note=note):
                print("Pad pressed:", note)


def main():
    bw = Bitwig()
    l = Launchpad()
    l.clear()
    cp = ControlPage(bw, l)
    cp.paint()
    l.subscribe(cp)
    print("Listening for pad presses... (Ctrl+C to quit)")
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == "__main__":
    main()
