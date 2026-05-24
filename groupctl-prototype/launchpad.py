from events import (
    EventBus,
    LaunchpadEvent,
    TopButton,
    SideButton,
    PadClick,
    PadHold,
    TopButtonClick,
    TopButtonHold,
    SideButtonClick,
    SideButtonHold,
)
import time
import mido


HOLD_THRESHOLD = 0.4


class _GestureState:
    def __init__(self):
        self.down_at: float | None = None
        self.hold_emitted: bool = False


class Launchpad:
    def __init__(self, bus: EventBus):
        self.bus = bus
        self.port = mido.open_output('Launchpad MK2 12')
        self.input = mido.open_input('Launchpad MK2 12')
        self._gestures: dict[tuple[str, int], _GestureState] = {}
        
    def _mk2_note_to_pad_n(self, note: int) -> int:
        """Convert a Launchpad MK2 grid note (11-88) to a 1-64 pad index
        (bottom-to-top, left-to-right)."""
        row = note // 10  # 1 (bottom) .. 8 (top)
        col = note % 10   # 1 (left) .. 8 (right)
        return (row - 1) * 8 + col

    def _emit(self, event: LaunchpadEvent):
        self.bus.append(event)

    def _gs(self, key: tuple[str, int]) -> _GestureState:
        if key not in self._gestures:
            self._gestures[key] = _GestureState()
        return self._gestures[key]

    def _make_event(self, key: tuple[str, int], gesture: str) -> LaunchpadEvent:
        tag, ident = key
        btn: TopButton | SideButton | None = None
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
                    key = ('pad', self._mk2_note_to_pad_n(msg.note))
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

