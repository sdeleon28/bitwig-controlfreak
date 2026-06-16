# Project explorer spec

## Requirements

The project explorer has already been implemented in javascript, this is the
java re-write of the feature. Only use javascript example code as a source for
understanding how it whould behave, DO NOT base your implementation off of that.

The project explorer offers navigation controls for the bitwig project. It uses
markers as the basis to calculate the pads that are visible in the launchpad.
Launchpad pads are used both for visualization and for controlling bitwig.
Sections are calculated as they are in the javascript implementation (but
following the event-sourcing java patterns instead).

Pads represent the timeline of the bitwig session. The markers define the color
of the represented section. How many pads are presented are calculated by the
ResolutionCalculator.

You can also change the selection by pressing the record arm button, then a
first and last pad to make the selection. Longpressing the rec arm button
clears the selection.

## Impl

Follow existing patterns from the mixmachine package.

We use event sourcing. We communicate with Bitwig and hardware controllers via
the main event bus.

Pseudo-python of the high level entrypoint:

```
class Explorer:
    def __init__(self, bus):
        self.bus.subscribe(self)
        self.bars_calculator = BarsCalculator()
        self.selection_highlighter = SelectionHighlighter(bus)
        self.playback_highlighter = PlaybackHighlighter(bus)
        self.resolution_calculator = ResolutionCalculator()
        self.page_filter = PageFilter()
    
        self.playback_handler = PlaybackHandler(bus)
        self.selection_handler = SelectionHandler(bus)
        self.resolution_ctl = ResolutionCtl(bus)
        self.page_ctl = ExplorerPageCtl(bus)
        self.selection_ctl = SelectionCtl(bus)

    def paint(self):
        events = markers
            | self.bars_calculator.apply
            | self.selection_highlighter.apply
            | self.playback_highlighter.apply
            | self.resolution_calculator.apply
            | self.page_filter.apply
        self.bus.send(events)

    def on(self, event):
        match event:
            case MarkersUpdated(markers=markers):
                self.markers = markers
                self.paint()
```

### The paint pipeline

The main paint function should be implemented as a functional pipeline made of
smaller building blocks that compose to create a series of events to paint
the project explorer at a given time.

#### BarsCalculator

Turns the marker metadata from the BitwigMarkersChanged event into a
datastructure that represents a list of colored blocks for the entire project.

#### SelectionHighlighter

Overrides some of the blocks to white following the time selection.

#### Playbackighlighter

Marks the cursor position.

#### ResolutionCalculator

Upscales / downscales the amount of blocks to be displayed.

#### PageFilter

Calculates the offset and cutoff acording to the selected page.

### Event handlers

#### PlaybackHandler

Handles pad presses and sends RequestSetPlaybackPosition. Should be handled
BiwtigPlaybackTracker.

#### SelectionCtl

Handles selection mode, selection start and end gesture. Talks to 
BitwigSelectionTracker via events.

#### ResolutionCtl

Similar to pager. Defines resolution in the same way the javascript 
implementation does (using the same buttons and defaults) but uses this
codebase's patterns.

#### ExplorerPageCtl

Internal pager. Similar to Pager.java but for internal explorer pages. We
already have a javascript implementation that you can use to know how it should
BEHAVE (but ignore the implementation patterns).

### Bitwig tracking

#### BitwigMarkersTracker

Follows other trackers in the codebase to produce a full schema of markers with
their positions and colors every time marker metadata changes in the project.

#### BitwigPlaybackTracker

Handles RequestSetPlaybackPosition and broadcasts playback events.

#### BitwigSelectionTracker

Tracks and sets selection.
