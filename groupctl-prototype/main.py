from events import EventBus, RequestSelectGroupEvent
from growler import Growler
from launchpad import Launchpad
from groupctl import GroupCtl


def main():
    bus = EventBus()
    growler = Growler(bus)
    l = Launchpad(bus)
    groupctl = GroupCtl(bus)
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == '__main__':
    main()
