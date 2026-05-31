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
from groupctl import LaunchpadGroupCtl
from trackctl import LaunchpadTrackCtl, TwisterTrackCtl
from volpanctl import VolPanCtl
from modectl import ModeCtl
from fixtures import complete_fixture
from logger import Logger
from testui.testui import TestUi

def main():
    bus = EventBus()
    logger = Logger(bus)
    growler = Growler(bus)
    l = Launchpad(bus)
    t = Twister(bus)
    launchopad_groupctl = LaunchpadGroupCtl(bus)
    launchpad_trackctl = LaunchpadTrackCtl(bus)
    twister_trackctl = TwisterTrackCtl(bus)
    volpanctl = VolPanCtl(bus)
    modectl = ModeCtl(bus)
    bitwig = Bitwig(bus)
    ticker = Ticker(bus)
    pager = Pager(bus)
    bus.send(
        SchemaChanged(
            tracks=complete_fixture,
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
