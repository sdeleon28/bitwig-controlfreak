from enum import IntEnum
from events import (
    Event,
    EventBus,
    EventBusSubscriber,
    LightPadUp,
    PaintTopButton,
    TopButton,
    TopButtonClick,
    PageSelected,
)


class Page(IntEnum):
    groupctl = 0
    project_explorer = 1



class Pager(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self.current_page: int = 0
        self._repaint()

    def _get_page_count(self):
        # TODO: make calculated
        return 2

    def _prev_page(self):
        if self.current_page > 0:
            self.current_page -= 1
            self._clear()
            self._repaint()
            self.bus.send(PageSelected(self.current_page))
            # FIXME: send PageSelected event
        
    def _next_page(self):
        if self.current_page < self._get_page_count() - 1:
            self.current_page += 1
            self._clear()
            self._repaint()
            self.bus.send(PageSelected(self.current_page))
            # FIXME: send PageSelected event

    def _clear(self):
        for i in range(1, 65):
            self.bus.send(LightPadUp(n=i, color=0))

    def _repaint(self):
        self.bus.send(PaintTopButton(button=TopButton.up, color=0))
        self.bus.send(PaintTopButton(button=TopButton.down, color=0))
        if self.current_page != 0:
            self.bus.send(PaintTopButton(button=TopButton.up, color=69))
        if self.current_page < self._get_page_count() - 1:
            self.bus.send(PaintTopButton(button=TopButton.down, color=69))

    def on(self, event: Event) -> None:
        match event:
            case TopButtonClick(button=TopButton.up):
                self._prev_page()
            case TopButtonClick(button=TopButton.down):
                self._next_page()
