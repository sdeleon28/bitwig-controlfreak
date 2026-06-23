# get good drums mapping

The way the midi editor is wired, the second page of the midi editor has C1 at
the bottom row of the launchpad and increments chromatically from there
(verify).

This is cool for bitwig drum machines that are set up by default in that order.

I want the editor program to be smart enough to have a different mapping when
a clip that exists within a get good drums track is selected from the bitwig UI.
Let's make that determination via a simple string comparison: if the track that
holds the clip has "ggd" in its name (case insensitive), the mappings are
different.

## editor page 1 (global page 3)

row | note | instrument
------------------
  8 | A#4  | Crash 2
  7 | G#4  | Crash 1
  6 | F3   | China
  5 | D#4  | Ride Bell
  4 | C#4  | Ride
  3 | B3   | Tom 3
  2 | G#3  | Tom 2
  1 | F#3  | Tom 1

## editor page 2 (global page 4)

row | note | instrument
------------------
  8 | F#2  | HH4      
  7 | G#2  | HH3      
  6 | B2   | HH2      
  5 | G2   | HH1      
  4 | D#3  | Snare 2
  3 | C#3  | Snare 1
  2 | D3   | Kick 2       
  1 | C3   | Kick 1       
