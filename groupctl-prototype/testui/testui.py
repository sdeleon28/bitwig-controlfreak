from textual.app import App, ComposeResult
from testui.slider import Slider

# class MySlider(Slider):
#     def on_slider_changed(self, slider, value):
#         self.notify(f"{slider} changed to {value}", title="y'ello", severity="information")


class TestUi(App):
    BINDINGS = [
        # ("d", "toggle_dark", "Toggle dark mode"),
    ]
    
    CSS_PATH = "testui.tcss"

    def compose(self) -> ComposeResult:
        yield Slider(min=0, max=100, value=25, name="vol")

    def on_slider_changed(self, changed_message: Slider.Changed):
        self.notify(
            f"{changed_message.slider.name} -> {changed_message.value}",
            title="Changed",
            severity="information",
        )
