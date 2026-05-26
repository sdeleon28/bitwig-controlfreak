from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Label
from events import EventBus, TempoChanged
from testui.slider import Slider
from testui.palette import Palette


class Tempo(Widget):
    DEFAULT_CSS = """
    Tempo {
        layout: vertical;
        height: 5;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield Label("Tempo")
        yield Slider(min=30, max=300, value=110, name="tempo")

    def on_slider_changed(self, changed_message: Slider.Changed):
        self.bus.send(
            TempoChanged(
                tempo=changed_message.value,
            )
        )
