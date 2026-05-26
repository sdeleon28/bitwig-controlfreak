from typing import Callable
from textual.app import App, ComposeResult
from events import EventBus
from testui.track import Track


# How often we drain the Launchpad's MIDI input (seconds). Needs to be well
# under HOLD_THRESHOLD (0.4s) so hold gestures fire responsively.
POLL_INTERVAL = 1 / 120


class TestUi(App):
    CSS_PATH = "testui.tcss"

    def __init__(
        self,
        bus: EventBus,
        on_tick: Callable[[], None] | None = None
    ):
        super().__init__()
        self.bus = bus
        self._on_tick = on_tick

    def on_mount(self) -> None:
        if self._on_tick is not None:
            self.set_interval(POLL_INTERVAL, self._on_tick)

    def compose(self) -> ComposeResult:
        yield Track(self.bus)
