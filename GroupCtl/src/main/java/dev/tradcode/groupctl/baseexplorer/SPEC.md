# Base explorer spec

## What this package is

The project explorer offers navigation controls for the bitwig project on a
shared launchpad page. Pads represent the timeline; markers define the color of
each section; pads both visualize and control bitwig (press a pad to seek,
MIXER + two pads to set the time selection).

There are two views of the timeline:

- **normal** (`normalexplorer`) — every project marker on one continuous
  timeline, paged 64 pads at a time.
- **setlist** (`setlistexplorer`) — one `{ }` song at a time, with song and
  bar paging.

Exactly one is engaged at a time, chosen by whether the project contains a
complete `{ … }` song. `baseexplorer` is the shared substrate both build on; it
never depends on either feature package, and the feature packages never depend
on each other. Deleting the one line that constructs a feature's entrypoint
removes it whole.

> The feature was first prototyped in javascript. Use that only to understand
> intended behaviour — the java implementation is canonical.

## Impl

Event sourcing, as in the rest of the codebase: communication with bitwig, with
the hardware, and between explorer classes happens over the main event bus.

### Engagement

`ExplorerModeCoordinator` parses the markers and broadcasts
`ExplorerModeChanged(setlist)` whenever the answer flips. Each reducer and each
mode-specific control gates itself on this flag (plus `PageSelected` for being
on-screen). The coordinator is constructed before the feature reducers so a
marker change carries the correct mode to a reducer before it reduces.

Handover between views is by repaint, never by blanking: the newly engaged
reducer broadcasts a full 64-pad grid that overwrites the surface, and the
outgoing reducer simply stops broadcasting. Controls yield shared buttons
(LEFT/RIGHT) by ceasing to paint; they may blank their own exclusive buttons.

### Dataflow

```
bitwig trackers ─► domain events ─► reducer (normal | setlist) ─► ExplorerGridChanged
                                          │                              │
                                   ContentBarsChanged            ┌───────┴────────────┐
                                          │                      ▼                    ▼
                                     ResolutionCtl        ExplorerGridPainter   paging / selection
```

- **Calculation classes** consume domain events and emit *data* events; they
  never paint.
- **Painting classes** consume data events and emit only paint events; they
  never calculate.
- **Input controllers** translate hardware gestures into domain events.

### The reducers

Each feature's reducer is self-sufficient: it caches every input that affects
its grid (markers, committed + pending selection, playback, resolution, page,
`pageActive`, and the engagement flag) and recomputes on any change. It owns its
page number, applies a `RequestExplorerPage` step and clamps it to the fresh
page count before slicing, and broadcasts one `ExplorerGridChanged`. It only
broadcasts while on-page **and** engaged. The reducers differ only in their
*source blocks* — normal lays all markers onto bars; setlist lays a single song
onto bars — and share everything after that through `GridPipeline`.

#### GridPipeline (shared pure logic)

The single definition of the reduction from a view's colored source blocks to a
paintable page: highlight committed selection (unless a live gesture is active),
highlight the pending anchor, highlight the playhead, merge bars by resolution,
then slice to the page (clamped). Composes the stateless building blocks:

- **BarsCalculator** — markers → one-bar colored blocks (normal source).
- **SongParser** / **Song** — group markers into `{ }` songs (setlist source, and
  the coordinator's engagement test).
- **SelectionHighlighter**, **PlaybackHighlighter** — flag selected / playing.
- **ResolutionCalculator** — merge adjacent same-color bars by bars-per-pad.
- **PageFilter** — offset/cut to the 64-pad page.

### Painting

**ExplorerGridPainter** paints the 64 pads from `ExplorerGridChanged`: off for
empty, blinking white for the playhead, white for selected, else the section
color. Clearing on a page switch is the Pager's job.

### Shared input controllers

- **PlaybackHandler** — pad press → `RequestSetPlaybackPosition`; owns the STOP
  side button (lit while playing) → `RequestStopPlayback`.
- **SelectionCtl** — MIXER select-mode toggle and the two-tap range gesture,
  talking to `BitwigSelectionTracker` via events.
- **TransportTogglesCtl** — MUTE/SOLO/RECORD_ARM ↔ loop / metronome / record.
- **ResolutionCtl** — bars-per-pad (1..32) and auto-fit. Auto-fit is driven by
  `ContentBarsChanged` from the active reducer, so it fits the whole project
  (normal) or a single song (setlist) without knowing which. A manual zoom
  overrides auto-fit until the page is re-entered.

### Bitwig tracking

**BitwigMarkersTracker**, **BitwigPlaybackTracker** (playback + loop/metronome/
record toggles), **BitwigSelectionTracker** (the arranger loop as time
selection). `BaseExplorer` constructs the shared classes and forwards `flush()`
to the trackers.
