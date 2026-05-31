from typing import Literal
from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    PageSelected,
    PaintSideButton,
    SideButtonClick,
    PanModeSelected,
    SideButton,
    VolModeSelected,
)


VolPanMode = Literal["vol"] | Literal["pan"]


VOL_COLOR: Literal[69] = 69
PAN_COLOR: Literal[69] = 69


class VolPanCtl(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self.mode: VolPanMode = "vol"
        self.page_active: bool = True
        self._paint()

    def _paint(self) -> None:
        if not self.page_active:
            return
        self.bus.send(
            PaintSideButton(
                button=SideButton.volume,
                color=VOL_COLOR if self.mode == "vol" else 0,
            )
        )
        self.bus.send(
            PaintSideButton(
                button=SideButton.pan,
                color=VOL_COLOR if self.mode == "pan" else 0,
            )
        )
        
    def on(self, event: Event) -> None:
        match event:
            case SideButtonClick(button=SideButton.volume):
                self.mode = "vol"
                self.bus.send(VolModeSelected())
                self._paint()
            case SideButtonClick(button=SideButton.pan):
                self.mode = "pan"
                self.bus.send(PanModeSelected())
                self._paint()
            case PageSelected(n=n):
                self.page_active = n == 0
                self._paint()
