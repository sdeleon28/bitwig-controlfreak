# midi editor

The third page in the launchpad represents a MIDI editor.

## Purpose

Easily edit drum beats from the launchpad.

## Resolution

Should allow for 1/4, 1/8, 1/16, 1/32 resolution (default to 1/8). Resolution
ctl class should mirror explorer equivalent. No triplet grid for now.

## Cursor behavior

We should follow a clip cursor and the editor should be context aware. Source
of truth for what MIDI clip is displayed is Bitwig native selection. When
no clip is selected, this page should do nothing.

## Quantization

In order for events to line up with the launchpad grid, we need to run them
through a quantization filter. This should be a non-destructive filter
(shouldn't modify any notes until the user interacts with the editor). We ignore
note lengths (this MIDI editor is only meant for percussion instruments).

## Pad behavior

A pad that has a corresponding note falling within its quantized position should
light up (color 69, very nice!). Clicking on that pad removes the note that
matches. If there are multiple notes, remove all of them.

Pressing an unlit pad should create an event in the position corresponding to
that pad.

## Mapping

C1 -> row 1
C#1 -> row 2
D -> row 3
D# -> row 4
...

## Design

Follow the same communication style as in the explorer. A tracker class
broadcasts clip state, a computation class calculates a pure data structure
to represent the grid (very similar to explorer.GridCalculator). Handler
classes send events to bitwig and the modifications it makes cause the whole
one directional data flow to produce the correct output again.

Separate concerns require separate classes: bitwig state tracking, computation,
painting, hardware event handling.

## Playback

Adding a note auditions it immediately through the clip's track, but only while
the transport is stopped — during playback the clip already sounds it.

A play cursor sweeps the grid: the clip's playing step is mapped to the beat
under the cursor, the column spanning it lights up (notes there flash brighter),
and the column clears when playback stops. The step is clip-relative, so the
cursor tracks the clip wherever it sits in the arranger.

## Note context (context-aware Twister)

Holding a lit pad brings up context-aware Twister encoders (velocity today) that
operate on notes. Bitwig's own note selection is the single source of truth:

* Holding pads is equivalent to *temporarily selecting* those notes. The hold
  gesture (`PadContextCtl`) only translates held pads into a `RequestSelectNotes`
  that asks the clip tracker to make the Bitwig selection exactly those notes;
  releasing the last pad clears the selection. It keeps no projection of its own
  beyond the in-flight gesture.
* The clip tracker mirrors `NoteStep.isIsSelected()` back out through the normal
  clip → grid pipeline, so a selected note flows into `EditorSlot.selected()`.
* Selected pads paint red (`EditorGridPainter`) and the Twister context
  (`TwisterMidiContextCtl`) arms from the selected slots. Because both read the
  round-tripped selection, manually selecting notes in Bitwig also lights the
  pads and arms the encoders — the gesture is just one way to drive selection.
* Bitwig has no per-note deselect, so the tracker rebuilds the whole selection
  on each request (clear on the first cell, add the rest) and clears by selecting
  an empty cell with `clearCurrentSelection`.

## Advanced paging

As we go into higher resolutions, paging becomes more cumbersome, so we have an
internal paging mechanism to keep it simple to interact with the pages and see
how many pages there are in the current resolution.

### How it behaves now (the main grid as a page picker)

The page count and picker live on the **main 8x8 grid**, not the side buttons.
The side buttons are only the left/right arrows.

* The two side arrows page left/right one page at a time. Their paint reflects
  reachability: an arrow lights only when there's a page to go to in its
  direction.
  * The page change fires on button **up** (release), not button down. This
    frees the down edge so pressing both arrows together can arm a mode instead
    of paging.
  * Paging scrolls the column window one column at a time, mirroring the
    vertical scroll animation (`EditorHorizontalPager`).
* **Horizontal pager mode** is armed by holding both arrows down at once.
  * While the mode is on, the 8x8 grid becomes a page picker: every reachable
    page is laid across the pads in reading order (page 0 top-left, filling
    rightwards then down) with the current page painted brightest.
  * Tapping a pad jumps to that page and leaves the mode.
  * Both arrows blink while the mode is on.
  * You leave the mode by tapping a page pad or by pressing either arrow (a
    single arrow press while in mode just drops the mode without paging).
* **Resolution change** briefly flashes the same grid page-picker layout as a
  size indicator (for about as long as the scroll animation lasts), then the
  note view returns. The grid is always restored by asking
  `EditorGridCalculator` to repaint, never by blanking pads.

The page count is derived from `GridGeometry.totalPages(denominator,
lengthBeats)` — the same resolution and clip length the pagers read — so the
layout is correct regardless of which event publishes first.

Owners: `EditorPageCtl` (arrows + arming the mode), `EditorPageSelectorCtl`
(the grid page picker + resolution flash), `EditorHorizontalPager` (the actual
column-window paging and animation).

### Alternative mechanism (side buttons) — not currently implemented

The original design put the page indicator on the **side buttons** instead of
the main grid. Kept here as an alternative we may want to recreate:

* Flash the amount of pages and highlight current page with a different color
  in the side buttons
  * When we change one of the pages from the left and right arrow buttons
  * When we change the resolution
  * This should happen for about as long as the page animation is going on
    * Horizontal paging animation should mirror the vertical one we have in
      place
* Change the page change event in the left / right arrows to be on button up
  (instead of button down).
  * This makes it possible to have a HorizontalPagerModeStart event when we
    press both arrows at the same time.
  * When the mode is on, the side buttons blink (current page with its own
    color).
  * You can go out of horizontal pager mode by selecting one of the pages or
    by pressing one of the right / left arrows.
  * right / left arrows should also flash while in horizontal pager mode.
