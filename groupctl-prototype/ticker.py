import time
from events import (
    EventBus,
    EventBusSubscriber,
    TempoChanged,
    Tick,
)

PPQN = 24


class Ticker(EventBusSubscriber):
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self.bus.subscribe(self)
        self.tempo: int | None = None
        self._next_tick: float | None = None

    def _get_interval(self) -> float | None:
        if not self.tempo:
            return None
        return 60.0 / self.tempo / PPQN

    def poll(self) -> None:
        interval = self._get_interval()
        if interval is None:
            self._next_tick = None
            return
        now = time.monotonic()
        if self._next_tick is None:
            self._next_tick = now + interval
            return
        if now >= self._next_tick:
            self.bus.send(Tick())
            self._next_tick += interval
            if self._next_tick < now:
                self._next_tick = now + interval

    def on(self, event) -> None:
        match event:
            case TempoChanged(tempo=tempo):
                self.tempo = tempo
                self._next_tick = None           # apply new tempo on next poll
