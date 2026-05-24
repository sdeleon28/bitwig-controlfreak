from events import (
    EventBus,
    RequestSelectGroupEvent,
    SchemaChangedEvent,
)
from growler import Growler
from launchpad import Launchpad
from groupctl import GroupCtl
from fixtures import track_structure_1
from logger import Logger

def main():
    bus = EventBus()
    logger = Logger(bus)
    growler = Growler(bus)
    l = Launchpad(bus)
    groupctl = GroupCtl(bus)
    bus.append(
        SchemaChangedEvent(
            tracks=track_structure_1,
        )
    )
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == '__main__':
    main()
