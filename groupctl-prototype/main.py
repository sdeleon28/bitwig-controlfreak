from events import (
    EventBus,
    RequestSelectGroup,
    SchemaChanged,
)
from bitwig import Bitwig
from growler import Growler
from launchpad import Launchpad
from pager import Pager
from ticker import Ticker
from twister import Twister
from groupctl import GroupCtl
from trackctl import TrackCtl
from volpanctl import VolPanCtl
from modectl import ModeCtl
from fixtures import track_structure_1
from logger import Logger
from testui.testui import TestUi

def main():
    bus = EventBus()
    logger = Logger(bus)
    growler = Growler(bus)
    l = Launchpad(bus)
    t = Twister(bus)
    groupctl = GroupCtl(bus)
    trackctl = TrackCtl(bus)
    volpanctl = VolPanCtl(bus)
    modectl = ModeCtl(bus)
    bitwig = Bitwig(bus)
    ticker = Ticker(bus)
    pager = Pager(bus)
    bus.send(
        SchemaChanged(
            tracks=track_structure_1,
        )
    )
    def _on_tick():
        l.poll()
        t.poll()
        ticker.poll()

    test_ui = TestUi(
        bus,
        on_tick=_on_tick,
    )
    try:
        test_ui.run()
    finally:
        l.clear()


if __name__ == '__main__':
    main()
