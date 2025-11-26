# Clip Launcher Usage Guide

## Overview

Page 2 of the Launchpad MK2 controller provides clip launcher control for Bitwig Studio's session view. This page allows you to launch clips and stop tracks using an 8×7 clip grid layout.

## Navigating to Clip Launcher Page

Press **Top Button 2** (Next Page) to navigate to page 2. The number "2" will flash on the Launchpad grid to confirm you've switched to the clip launcher page.

To return to the main control page, press **Top Button 1** (Previous Page).

## Grid Layout

The Launchpad grid is organized as follows:

```
Row 8  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 6
Row 7  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 5
Row 6  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 4
Row 5  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 3
Row 4  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 2
Row 3  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 1
Row 2  [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip] [Clip]  ← Scene 0
Row 1  [Stop] [Stop] [Stop] [Stop] [Stop] [Stop] [Stop] [Stop]  ← Stop buttons
       Track1 Track2 Track3 Track4 Track5 Track6 Track7 Track8
```

- **Rows 2-8**: Launch clip slots for tracks 1-8 across scenes 0-6 (7 scenes total)
- **Row 1**: Stop buttons for each track

## Launching Clips

To launch a clip, press the pad corresponding to the track and scene you want to trigger.

**Example**: To launch the clip in Track 3, Scene 2:
- Press the pad in column 3, row 4

The clip will start playing, and the pad will change color to indicate the playing state.

## Stopping Tracks

To stop a track, press the corresponding stop button in **Row 1** (bottom row).

**Example**: To stop Track 5:
- Press the pad in column 5, row 1

All clips on that track will stop playing.

## Visual Feedback

The Launchpad provides color-coded visual feedback for different clip states:

### Clip States

| State | Color | Description |
|-------|-------|-------------|
| **Empty** | Black (off) | No clip exists in this slot |
| **Has Content** | Track color | Clip exists but is not playing |
| **Playing** | Bright (track color + white) | Clip is currently playing |
| **Recording** | Red | Clip is currently recording |
| **Playback Queued** | Flashing bright | Clip is queued to play on next beat/bar |
| **Recording Queued** | Dark red | Clip is queued to record on next beat/bar |

### Track Colors

Each column uses the color of its corresponding track in Bitwig Studio. This makes it easy to identify which pads control which tracks.

### Color Priority

When multiple states apply to a clip, the following priority order determines the displayed color:

1. Recording Queued (dark red)
2. Recording (bright red)
3. Playback Queued (bright track color)
4. Playing (track color + white mix)
5. Has Content (track color)
6. Empty (black/off)

## Track Bank

The clip launcher displays the first 8 tracks in your Bitwig project across 7 scenes (scenes 0-6).

**Note**: Track and scene scrolling is not yet implemented. You are viewing tracks 1-8 and scenes 0-6.

## Tips

- **Quick Stop All**: Stop individual tracks using row 1, or use Bitwig's transport controls to stop all playback
- **Visual Scanning**: Use the track color coding to quickly identify which tracks contain clips
- **State Awareness**: Bright colors indicate active/queued states, while dim colors indicate clips that are loaded but not playing
- **Page Switching**: Your encoder mappings and other controller state persist when switching between pages

## Limitations

Current limitations (see clip-launcher-future-enhancements.md for planned features):

- No track/scene scrolling - fixed to first 8 tracks and first 7 scenes
- No scene launch functionality
- No clip delete/duplicate/quantization controls
- Stop buttons are always visible (no alternative modes)
- No visual feedback for track arm/solo/mute states

## Troubleshooting

**Problem**: Pads don't respond when pressed
- Make sure you're on page 2 (press Top Button 2)
- Verify the controller is properly connected to Bitwig Studio
- Check that the script loaded without errors in Bitwig's Controller Scripts panel

**Problem**: Colors don't match track colors in Bitwig
- Track colors update when clips are added/removed or when tracks are selected
- Try switching pages and returning to page 2 to refresh colors

**Problem**: Clips don't launch when pressed
- Ensure the track bank is properly initialized
- Check Bitwig's session view to verify clips exist in the expected slots
- Verify you're pressing pads in rows 2-8 (clip rows), not row 1 (stop buttons)
