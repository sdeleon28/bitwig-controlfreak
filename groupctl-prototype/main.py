from events import (
    EventBus,
    RequestSelectGroup,
    SchemaChanged,
)
from bitwig import Bitwig
from growler import Growler
from launchpad import Launchpad
from groupctl import GroupCtl
from fixtures import track_structure_1
from logger import Logger
from testui.testui import TestUi

def main():
    bus = EventBus()
    logger = Logger(bus)
    growler = Growler(bus)
    l = Launchpad(bus)
    groupctl = GroupCtl(bus)
    bitwig = Bitwig(bus)
    bus.send(
        SchemaChanged(
            tracks=track_structure_1,
        )
    )
    test_ui = TestUi(on_tick=l.poll)
    try:
        test_ui.run()
    finally:
        l.clear()


if __name__ == '__main__':
    main()
