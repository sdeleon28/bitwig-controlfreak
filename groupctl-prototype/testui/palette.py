from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static
from textual.color import Color
from colors import BwColor

class PaletteItem(Widget):
    DEFAULT_CSS = """
    PaletteItem {
        width: 3.5;
    }
    """

    def __init__(
        self,
        color: BwColor,
        *,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
     ) -> None:
        super().__init__(name=name, id=id, classes=classes, disabled=disabled)
        self.color = color

    def compose(self) -> ComposeResult:
        self.static0 = Static()
        yield self.static0

    def on_mount(self) -> None:
        r, g, b = map(int, self.color.split(","))
        self.static0.styles.background = Color(r, g, b)


class PaletteRow0(Widget):
    DEFAULT_CSS = """
    PaletteRow0 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def compose(self) -> ComposeResult:
        yield PaletteItem("84,84,82") # black
        yield PaletteItem("122,122,122") # gray
        yield PaletteItem("200,200,200") # white
        yield PaletteItem("134,136,170") # pale purple
        yield PaletteItem("162,120,64") # brown
        yield PaletteItem("198,158,110") # pale brown
        yield PaletteItem("86,96,198") # blue
        yield PaletteItem("132,138,224") # pale blue
        yield PaletteItem("148,72,202") # purple

class PaletteRow1(Widget):
    DEFAULT_CSS = """
    PaletteRow1 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def compose(self) -> ComposeResult:
        yield PaletteItem("216,56,110") # magenta
        yield PaletteItem("216,46,34") # red
        yield PaletteItem("254,86,4") # orange
        yield PaletteItem("216,156,14") # light orange
        yield PaletteItem("114,152,18") # dark lime
        yield PaletteItem("0,156,68") # green
        yield PaletteItem("0,166,146") # dim aqua
        yield PaletteItem("0,152,214") # teal
        yield PaletteItem("188,118,240") # light purple

class PaletteRow2(Widget):
    DEFAULT_CSS = """
    PaletteRow2 {
        layout: horizontal;
        height: 1;
        content-align: center middle;
    }
    """

    def compose(self) -> ComposeResult:
        yield PaletteItem("224,102,142") # pink
        yield PaletteItem("236,96,84") # pinkorange
        yield PaletteItem("254,130,60") # sober orange
        yield PaletteItem("228,182,76") # yellow
        yield PaletteItem("160,192,74") # light lime
        yield PaletteItem("62,184,96") # light green
        yield PaletteItem("66,210,182") # sky blue
        yield PaletteItem("68,200,254") # blinding cyan
        yield PaletteItem("208,184,218") # lightest purple


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

    def compose(self) -> ComposeResult:
        yield PaletteRow0()
        yield PaletteRow1()
        yield PaletteRow2()
