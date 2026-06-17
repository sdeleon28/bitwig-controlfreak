# CLAUDE.md

We're implementing ./VISION.md via ./ROADMAP.todo

## Design guidelines

This is carefully designed system that is fully decoupled using event sourcing.
Classes are small, own the correct amount of state to do their job and
communicate with the rest of the system via events.

Think of internal class state as projections of the system state, which is
determined by the sequence of events.

## Broad kinds of classes

### Trackers

These usually encapsulate the Bitwig API. Their responsibility is performing
the correct ceremonies with the Bitwig API to interact with it in the way the
API authors intended, while abstracting the API to the rest of the system via
events.

Trackers listen to events to perform actions on Bitwig, and listen to Bitwig
events to translate and simplify them to the subscribers of the main event bus.

### Ctl classes

These usually own a portion of a hardware device (Launchpad / Twister / others
in the future). They own the projections necessary to make that portion of the
device perform a task. Ctl classes are context-aware, they only paint or handle
hardware events when the UX of the program requires. They keep capturing system
projections so that they are ready for action the next time they get activated.

### Hardware wrappers

These classes provide an abstraction over the low level details of the devices
they wrap. They turn device events into system events and listen to system
events on the bus to translate them into hardware actions. Hardware
implementation details must not escape these wrappers.

## Pure logic classes

Some problems require purely functional data reduction without crossing into the
Bitwig API or interacting directly with hardware devices.

## Package entrypoints

Assemble the dependency injection and bus interactions in a subsystem to make it
easily pluggable into the extension.
