from typing import Callable
from textual.app import App, ComposeResult
from testui.slider import Slider

# class MySlider(Slider):
#     def on_slider_changed(self, slider, value):
#         self.notify(f"{slider} changed to {value}", title="y'ello", severity="information")


# How often we drain the Launchpad's MIDI input (seconds). Needs to be well
# under HOLD_THRESHOLD (0.4s) so hold gestures fire responsively.
POLL_INTERVAL = 1 / 120


class TestUi(App):
    BINDINGS = [
        # ("d", "toggle_dark", "Toggle dark mode"),
    ]

    CSS_PATH = "testui.tcss"

    def __init__(self, on_tick: Callable[[], None] | None = None):
        super().__init__()
        self._on_tick = on_tick

    def on_mount(self) -> None:
        # Drive the Launchpad poll from Textual's own event loop instead of a
        # competing `while True` loop. poll() is non-blocking so it's cheap to
        # run every tick.
        if self._on_tick is not None:
            self.set_interval(POLL_INTERVAL, self._on_tick)

    def compose(self) -> ComposeResult:
        yield Slider(min=0, max=100, value=25, name="vol")

    def on_slider_changed(self, changed_message: Slider.Changed):
        self.notify(
            f"{changed_message.slider.name} -> {changed_message.value}",
            title="Changed",
            severity="information",
        )
