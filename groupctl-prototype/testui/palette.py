from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static
from textual.color import Color
from colors import BwColor, BITIWG_TO_TWISTER_COLORS
from events import ChangeEncoderColor, EventBus


class PaletteItem(Widget):
    DEFAULT_CSS = """
    PaletteItem {
        width: 3.5;
    }
    """

    def __init__(
        self,
        bus: EventBus,
        color: BwColor,
        *,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
     ) -> None:
        super().__init__(name=name, id=id, classes=classes, disabled=disabled)
        self.bus = bus
        self.color = color

    def compose(self) -> ComposeResult:
        self.static0 = Static()
        yield self.static0

    def on_mount(self) -> None:
        r, g, b = map(int, self.color.split(","))
        self.static0.styles.background = Color(r, g, b)

    def on_click(self) -> None:
        color = BITIWG_TO_TWISTER_COLORS.get(self.color)
        if color:
            self.bus.send(
                ChangeEncoderColor(
                    n=1,
                    color=color,
                ),
            )


class PaletteRow0(Widget):
    DEFAULT_CSS = """
    PaletteRow0 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield PaletteItem(self.bus, "84,84,82") # black
        yield PaletteItem(self.bus, "122,122,122") # gray
        yield PaletteItem(self.bus, "200,200,200") # white
        yield PaletteItem(self.bus, "134,136,170") # pale purple
        yield PaletteItem(self.bus, "162,120,64") # brown
        yield PaletteItem(self.bus, "198,158,110") # pale brown
        yield PaletteItem(self.bus, "86,96,198") # blue
        yield PaletteItem(self.bus, "132,138,224") # pale blue
        yield PaletteItem(self.bus, "148,72,202") # purple

class PaletteRow1(Widget):
    DEFAULT_CSS = """
    PaletteRow1 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield PaletteItem(self.bus, "216,56,110") # magenta
        yield PaletteItem(self.bus, "216,46,34") # red
        yield PaletteItem(self.bus, "254,86,4") # orange
        yield PaletteItem(self.bus, "216,156,14") # light orange
        yield PaletteItem(self.bus, "114,152,18") # dark lime
        yield PaletteItem(self.bus, "0,156,68") # green
        yield PaletteItem(self.bus, "0,166,146") # dim aqua
        yield PaletteItem(self.bus, "0,152,214") # teal
        yield PaletteItem(self.bus, "188,118,240") # light purple

class PaletteRow2(Widget):
    DEFAULT_CSS = """
    PaletteRow2 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield PaletteItem(self.bus, "224,102,142") # pink
        yield PaletteItem(self.bus, "236,96,84") # pinkorange
        yield PaletteItem(self.bus, "254,130,60") # sober orange
        yield PaletteItem(self.bus, "228,182,76") # yellow
        yield PaletteItem(self.bus, "160,192,74") # light lime
        yield PaletteItem(self.bus, "62,184,96") # light green
        yield PaletteItem(self.bus, "66,210,182") # sky blue
        yield PaletteItem(self.bus, "68,200,254") # blinding cyan
        yield PaletteItem(self.bus, "208,184,218") # lightest purple


class Palette(Widget):
    DEFAULT_CSS = """
    Palette {
        width: 31.5;
        height: 3;
        min-height: 3;
        background: $surface;
        layout: vertical;
        content-align: center middle;
    }
    """

    def __init__(self, bus: EventBus, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.bus = bus

    def compose(self) -> ComposeResult:
        yield PaletteRow0(self.bus)
        yield PaletteRow1(self.bus)
        yield PaletteRow2(self.bus)
