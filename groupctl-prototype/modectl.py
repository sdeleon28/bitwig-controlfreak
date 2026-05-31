from typing import Literal
from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    PageSelected,
    PaintSideButton,
    SideButton,
    SideButtonClick,
)


Mode = (
      Literal["sends"]
    | Literal["select"]
    | Literal["mute"]
    | Literal["solo"]
    | Literal["rec"]
)


SENDS_COLOR: Literal[69] = 69
SELECT_COLOR: Literal[69] = 69
MUTE_COLOR: Literal[69] = 69
SOLO_COLOR: Literal[69] = 69
REC_COLOR: Literal[69] = 69


class ModeCtl(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self._mode: Mode = "select"
        self._page_active: bool = True
        self._paint()

    def _paint(self) -> None:
        if not self._page_active:
            return
        self._clear()
        match self._mode:
            case "sends":
                self.bus.send(
                    PaintSideButton(
                        button=SideButton.send_a,
                        color=SENDS_COLOR,
                    )
                )
            case "select":
                self.bus.send(
                    PaintSideButton(
                        button=SideButton.stop,
                        color=SELECT_COLOR,
                    )
                )
            case "mute":
                self.bus.send(
                    PaintSideButton(
                        button=SideButton.mute,
                        color=MUTE_COLOR,
                    )
                )
            case "solo":
                self.bus.send(
                    PaintSideButton(
                        button=SideButton.solo,
                        color=SOLO_COLOR
                    )
                )
            case "rec":
                self.bus.send(
                    PaintSideButton(
                        button=SideButton.record_arm,
                        color=REC_COLOR,
                    )
                )

    def _clear(self) -> None:
        self.bus.send(
            PaintSideButton(button=SideButton.send_a, color=0),
            PaintSideButton(button=SideButton.stop, color=0),
            PaintSideButton(button=SideButton.mute, color=0),
            PaintSideButton(button=SideButton.solo, color=0),
            PaintSideButton(button=SideButton.record_arm, color=0),
        )

    def on(self, event: Event) -> None:
        match event:
            case SideButtonClick(button=SideButton.send_a):
                self._mode = "sends"
                self._paint()
            case SideButtonClick(button=SideButton.stop):
                self._mode = "select"
                self._paint()
            case SideButtonClick(button=SideButton.mute):
                self._mode = "mute"
                self._paint()
            case SideButtonClick(button=SideButton.solo):
                self._mode = "solo"
                self._paint()
            case SideButtonClick(button=SideButton.record_arm):
                self._mode = "rec"
                self._paint()
            case PageSelected(n=n):
                self._page_active = n == 0
                self._paint()
