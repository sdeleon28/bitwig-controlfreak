import mido
from typing import Callable
from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    ChangeEncoderColor,
)
from colors import TwisterColor


PORT_NAME = "Midi Fighter Twister"

# MIDI channels (0-indexed, as mido expects).
_CH_VALUE = 0       # LED ring position
_CH_COLOR = 1       # RGB color index / button input
_CH_BRIGHTNESS = 2  # RGB brightness

BRIGHTNESS_OFF = 17
BRIGHTNESS_MAX = 47

TurnCallback = Callable[[int, int], None]   # (encoder 1-16, value 0-127)
PressCallback = Callable[[int, bool], None]  # (encoder 1-16, pressed)


def _encoder_to_cc(encoder: int) -> int:
    """Encoder 1-16 (bottom-left, right then up) -> device CC 0-15."""
    e0 = encoder - 1
    row = e0 // 4
    col = e0 % 4
    return (3 - row) * 4 + col


def _cc_to_encoder(cc: int) -> int:
    """Device CC 0-15 -> encoder 1-16 (bottom-left, right then up)."""
    row = cc // 4
    col = cc % 4
    return (3 - row) * 4 + col + 1


class Twister(EventBusSubscriber):
    def __init__(self, bus: EventBus, port_name: str = PORT_NAME):
        self.bus = bus
        self.bus.subscribe(self)
        self.port = mido.open_output(port_name)
        self.input = mido.open_input(port_name)
        self._on_turn: TurnCallback | None = None
        self._on_press: PressCallback | None = None

    def set_encoder_value(self, encoder: int, value: int) -> None:
        cc = _encoder_to_cc(encoder)
        self.port.send(mido.Message(
            "control_change", channel=_CH_VALUE, control=cc, value=value))

    def set_encoder_color(self, encoder: int, color: TwisterColor) -> None:
        cc = _encoder_to_cc(encoder)
        self.port.send(mido.Message(
            "control_change", channel=_CH_COLOR, control=cc, value=int(color)))
        self.port.send(mido.Message(
            "control_change", channel=_CH_BRIGHTNESS, control=cc,
            value=BRIGHTNESS_MAX))

    def on_encoder_turn(self, callback: TurnCallback) -> None:
        self._on_turn = callback

    def on_button_press(self, callback: PressCallback) -> None:
        self._on_press = callback

    def poll(self) -> None:
        for msg in self.input.iter_pending():
            if msg.type != "control_change" or not 0 <= msg.control <= 15:
                continue
            encoder = _cc_to_encoder(msg.control)
            if msg.channel == _CH_VALUE and self._on_turn:
                self._on_turn(encoder, msg.value)
            elif msg.channel == _CH_COLOR and self._on_press:
                self._on_press(encoder, msg.value > 0)

    def on(self, event: Event) -> None:
        match event:
            case ChangeEncoderColor(n=n, color=color):
                self.set_encoder_color(n, color)
