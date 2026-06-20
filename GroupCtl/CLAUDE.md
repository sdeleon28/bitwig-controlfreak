# CLAUDE.md

We're implementing ./VISION.md via ./ROADMAP.todo

## Design guidelines

This is carefully designed system that is fully decoupled using event sourcing.
Classes are small, own the correct amount of state to do their job and
communicate with the rest of the system via events.

Think of internal class state as projections of the system state, which is
determined by the sequence of events.

### Broad kinds of classes

#### Trackers

These usually encapsulate the Bitwig API. Their responsibility is performing
the correct ceremonies with the Bitwig API to interact with it in the way the
API authors intended, while abstracting the API to the rest of the system via
events.

Trackers listen to events to perform actions on Bitwig, and listen to Bitwig
events to translate and simplify them to the subscribers of the main event bus.

#### Ctl classes

These usually own a portion of a hardware device (Launchpad / Twister / others
in the future). They own the projections necessary to make that portion of the
device perform a task. Ctl classes are context-aware, they only paint or handle
hardware events when the UX of the program requires. They keep capturing system
projections so that they are ready for action the next time they get activated.

#### Hardware wrappers

These classes provide an abstraction over the low level details of the devices
they wrap. They turn device events into system events and listen to system
events on the bus to translate them into hardware actions. Hardware
implementation details must not escape these wrappers.

#### Pure logic classes

Some problems require purely functional data reduction without crossing into the
Bitwig API or interacting directly with hardware devices.

#### Package entrypoints

Assemble the dependency injection and bus interactions in a subsystem to make it
easily pluggable into the extension.

### Clearing hardware surfaces

Never blank a shared surface (Launchpad, Twister, or any device) from inside a
`Ctl` by emitting per-element "off" paints to hand the surface over. Driving
elements dark from a `Ctl` that is yielding races the controller taking over:
depending on subscriber order the clear can land *after* the new paint and wipe
it. This is a recurring source of message-ordering bugs.

A `Ctl` yields by ceasing to paint — nothing more. The surface is blanked with
the broad `ClearLaunchpad` / `ClearTwister` events, emitted once by the
coordinator that owns the transition (today the `Pager`, on page switch) and
handled by the hardware wrapper. When state then changes, broadcast it and let
each `Ctl` repaint from that broadcast; the incoming controller overwrites what
the outgoing one left. Clearing your own region as the first step of painting
*your own* content is fine — the rule is about blanking to yield.

## Testing

Test behaviour through the event bus, the same way the rest of the system talks
to a class: construct it with a `FakeEventBus`, send the events it reacts to, and
assert on the events it emits.

Do NOT add `_setSomething` / `_getSomething` hooks to production classes to reach
inside them from tests. A few trackers already have these (`_setMarkerCache`,
`_setRawTrackCache`, `_setRawSendCache`); they are a hack we regret and are
explicitly marked as an anti-pattern in those files — do not copy them or add new
ones. If something can only be exercised by poking private state, that's a design
signal, not a testing need: either it's the untestable Bitwig boundary (a tracker
whose only real logic is wiring the API to events — leave it untested, the
behaviour belongs to a `Ctl` or pure-logic class that you CAN drive over the bus),
or it wants a real seam (extract the logic, or inject a fake collaborator).

## Comment policy

Never explaion what the code does with comments. Prefer under-documented code
rather than exaggerated inline comments. Code should be self-documenting.
