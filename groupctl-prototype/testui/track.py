from textual.app import ComposeResult
from textual.widget import Widget
from testui.slider import Slider
from testui.palette import Palette


class Track(Widget):
    DEFAULT_CSS = """
    Track {
        layout: horizontal;
    }
    """

    def compose(self) -> ComposeResult:
        yield Slider(min=0, max=100, value=25, name="vol")
        yield Palette()

    def on_slider_changed(self, changed_message: Slider.Changed):
        self.notify(
            f"{changed_message.slider.name} -> {changed_message.value}",
            title="Changed",
            severity="information",
        )
