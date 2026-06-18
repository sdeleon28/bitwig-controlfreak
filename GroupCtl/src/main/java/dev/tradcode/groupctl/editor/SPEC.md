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
