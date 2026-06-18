# Project explorer spec

## Requirements

The project explorer has already been implemented in javascript, this is the
java re-write of the feature. Only use javascript example code as a source for
understanding how it whould behave, DO NOT base your implementation off of that.

The project explorer offers navigation controls for the bitwig project. It uses
markers as the basis to calculate the pads that are visible in the launchpad.
Launchpad pads are used both for visualization and for controlling bitwig.

Pads represent the timeline of the bitwig session. The markers define the color
of the represented section. How many pads are presented are calculated by the
ResolutionCalculator.

You can also change the selection by pressing the mixer button, then a
first and last pad to make the selection.

## Impl

Follow existing patterns from the mixmachine package. We use event sourcing:
most communication — with Bitwig, with the hardware, and between explorer
classes — happens over the main event bus. Direct method calls are allowed
in closely-related classes, but for the most part we use the bus.

### Dataflow

The explorer is a strict one-way pipeline over the bus:

```
bitwig trackers ─► domain events ─► GridCalculator ─► ExplorerGridChanged
                                                        │
                    ┌────────────────────┬──────────────┴──────────────┐
                    ▼                    ▼                             ▼
           ExplorerGridPainter    ExplorerPageCtl            PlaybackHandler /
           (pad paints)           (page LEDs, fwd/back)      SelectionCtl (seek/select)
```

Two roles, kept apart:

- **Calculation classes** consume domain events and emit *data* events. They
  never paint.
- **Painting classes** consume data events, cache the bits they care about, and
  emit *only* launchpad paint events (`PaintPad`, `BlinkPad`, `PaintTopButton`,
  `PaintSideButton`). They never calculate.

Input controllers (`ResolutionCtl`, `ExplorerPageCtl`, `SelectionCtl`) translate
hardware gestures into the domain events the calculator consumes, closing the
loop entirely over the bus.

`Explorer` is just the composition root: it constructs the classes below and
forwards `flush()` to the bitwig trackers. It holds no state and subscribes to
nothing.

### GridCalculator (the reducer)

The single, self-sufficient source of the explorer's visual state. It subscribes
to every input that affects the grid and caches each one:

- `MarkersChanged`
- `BitwigSelectionChanged`
- `PlaybackPositionChanged`
- `ResolutionChanged`
- `RequestExplorerPage` (a relative page step, +1/-1)
- `PageSelected` (to gate work on the explorer being on-screen)

On any change it runs the pure paint pipeline over its cached state and
broadcasts one `ExplorerGridChanged { slots, totalPages, page }`. Because it owns
all the state itself, it has no dependency on subscription order. It only
computes and broadcasts while the explorer page is active; entering the page
triggers a fresh broadcast.

It also owns the **page number and its bounds**. A `RequestExplorerPage` step is
applied to the page, which is then clamped to the freshly-computed page count
*before* slicing — so every broadcast grid is already valid for a real page and
a shrinking layout never produces an out-of-range frame to correct afterwards.

#### The pure paint pipeline

Stateless building blocks the calculator composes (each takes its inputs as
parameters — they hold no state and do not touch the bus):

- **BarsCalculator** — markers → list of one-bar colored blocks for the project.
- **SelectionHighlighter** — flags blocks overlapping the time selection.
- **PlaybackHighlighter** — flags the block under the cursor.
- **ResolutionCalculator** — merges adjacent same-color bars by bars-per-pad.
- **PageFilter** — offsets/cuts the blocks down to the 64-pad page.

The result is converted to `GridSlot`s (empty/color/selected/playing + beat
range) and `totalPages` is `ceil(blocks / 64)`.

### Painting classes

#### ExplorerGridPainter

Subscribes to `ExplorerGridChanged` and paints the 64 pads: off for empty,
blinking white for the playhead, white for selected, otherwise the section
color. Emits nothing else. Clearing the grid on a page switch is the Pager's
job, so it never needs to paint while off-page (the grid simply isn't broadcast
then).

#### ExplorerPageCtl

The two paging top-button LEDs. A pure view + input class — it owns no page
state. It caches the current page and page count from `ExplorerGridChanged` only
to light the LEDs (prev lit off page 0, next lit off the last page), and turns a
fwd/back press into a relative `RequestExplorerPage` step, gated so it never asks
to step past an end. GridCalculator owns the page number, applies the step and
clamps.

### Event handlers

#### PlaybackHandler

Handles pad presses and sends `RequestSetPlaybackPosition`, handled by
`BitwigPlaybackTracker`. Reads pad→beat from the broadcast grid. Also owns the
STOP side button: lights it while the explorer is on-screen and turns a press
into `RequestStopPlayback` (also handled by `BitwigPlaybackTracker`).

#### SelectionCtl

Handles selection mode, selection start and end gesture, and the MIXER top
button LED. Talks to `BitwigSelectionTracker` via events.

#### TransportTogglesCtl

Owns the MUTE and SOLO side buttons while the explorer is on-screen and turns
them into transport toggles: MUTE toggles the arranger loop (cyan), SOLO toggles
the metronome (yellow). It caches the loop/metronome state from
`TransportTogglesUpdate` only to light the LEDs (lit when on, dark when off) and
turns a press into a `RequestSetLoop` / `RequestSetMetronome` carrying the
desired new state. `BitwigPlaybackTracker` applies the request and re-broadcasts
the confirmed state, so the LED always reflects Bitwig even when the loop /
metronome are toggled from the UI. The `Growler` growls the request, surfacing
"Loop on/off" / "Metronome on/off".

#### ResolutionCtl

Owns the bars-per-pad resolution (halve/double between 1 and 32) and auto-fits
the project to one page on entry / on marker change. Emits `ResolutionChanged`.

### Bitwig tracking

#### BitwigMarkersTracker

Follows other trackers in the codebase to produce a full schema of markers with
their positions and colors every time marker metadata changes in the project.

#### BitwigPlaybackTracker

Handles `RequestSetPlaybackPosition` and broadcasts playback events. Also owns
the loop / metronome transport toggles: it observes `isArrangerLoopEnabled()` and
`isMetronomeEnabled()` (broadcasting `TransportTogglesUpdate` on flush) and
applies `RequestSetLoop` / `RequestSetMetronome` via those same typed
`SettableBooleanValue`s.

#### BitwigSelectionTracker

Tracks and sets selection.
