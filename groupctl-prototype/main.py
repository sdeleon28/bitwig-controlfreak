from events import EventBus, RequestSelectGroupEvent
from growler import Growler
from launchpad import Launchpad


def main():
    bus = EventBus()
    growler = Growler(bus)
    l = Launchpad(bus)
    try:
        while True:
            l.poll()
    except KeyboardInterrupt:
        l.clear()


if __name__ == '__main__':
    main()
