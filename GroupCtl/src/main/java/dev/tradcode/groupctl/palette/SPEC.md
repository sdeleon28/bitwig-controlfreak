# Palette pages spec

## Requirements

Two reference pages live at the very end of the page list. Each lays a slice of
the Launchpad's 128-colour velocity palette across the 8x8 grid so you can see
every colour the hardware can show and read off its number.

- Page `PALETTE_LOW` shows colours `0..63`, one per pad in reading order
  (colour 0 on the top-left pad, colour 63 on the bottom-right).
- Page `PALETTE_HIGH` shows colours `64..127` the same way.

Pressing any swatch reports the colour under it: the number goes to the script
console and pops up on screen. This is the whole point of the feature — a way to
discover the integer for a colour you like and use it elsewhere in the codebase.

The pages are inert otherwise: no navigation, no editing, no Twister use.

This mirrors the JavaScript `Page_ColorPalette` from the original project. Use
that only to understand intended behaviour; the implementation is our own.

## Impl

Event sourcing, like the rest of the system. The feature is one orthogonal
package behind a single entrypoint (`Palette`); deleting the line that constructs
it in `GroupCtlExtension` removes the behaviour. The two empty `PALETTE_*` enum
entries in `Page` (which the base `Pager` counts to know how far it can page) are
the only base touch-point, mirroring how the editor declares its pages.

### Dataflow

```
PageSelected ─► PaletteCtl ─► PaintPad x64        (swatches, while its page is active)
PadClicked  ─► PaletteCtl ─┬► Log                 (colour number to the console)
                           └► PaletteColorPicked ─► PaletteGrowler ─► popup
```

- `PaletteCtl` owns one page. It paints its 64 swatches when that page becomes
  active and yields — by simply ceasing to paint — when another page is selected;
  the `Pager` blanks the surface on the switch, so the Ctl never blanks pads
  itself. A pad press while active logs the colour and announces the pick.
- `PaletteGrowler` is the Bitwig popup boundary; it only translates
  `PaletteColorPicked` into a host notification.
- `Palette` constructs one `PaletteCtl` per palette page (offset 0 and 64) plus
  the growler.

### Geometry

`PaletteConstants.PADS` lists the 64 pad notes top-left → bottom-right, matching
`EditorConstants.PADS`. Swatch `i` shows colour `colorOffset + i` and sits on
`PADS.get(i)`.
