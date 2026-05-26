from textual.app import ComposeResult
from textual.widget import Widget
from events import EventBus
from testui.slider import Slider
from testui.palette import Palette


class Track(Widget):
    DEFAULT_CSS = """
    Track {
        layout: horizontal;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield Slider(min=0, max=100, value=25, name="vol")
        yield Palette(self.bus)

    def on_slider_changed(self, changed_message: Slider.Changed):
        self.notify(
            f"{changed_message.slider.name} -> {changed_message.value}",
            title="Changed",
            severity="information",
        )
