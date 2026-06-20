# frequalizer spec

## Requirements

The frequalizer feature controls a **FrequalizerAlt** plugin instance from the
Twister and a Launchpad quadrant. It lives in the `mixmachine.frequalizer` package
(a sub-package of mixmachine, with its own `events/` subpackage like explorer/editor)
and runs as part of the mixmachine program. It has already been implemented in
javascript (`FrequalizerDevice.js`, `FrequalizerTwisterMapper.js`,
`FrequalizerPadMapper.js`, `TwisterPainter.js`). Only use the javascript as a source
for understanding *what* the feature does. DO NOT base the design off of it — follow
the mixmachine / explorer / editor patterns.

What it does:

- The **Twister's 16 encoders** map onto the EQ bands of the focused FrequalizerAlt
  (frequency / quality / gain per band), with encoder buttons that toggle a band on,
  solo a band while held, and shift one encoder to the band's filter-type while held.
- A **Launchpad quadrant** holds the mid/side mode pads. Pressing a mode pad switches
  the device between Stereo / Mid / Side (and their solo sub-modes). Switching mode
  re-targets the 16 encoders onto a different set of bands and re-lights both surfaces.
- The encoder lights and rings are **dynamic**: they change as the device reports back
  band-active, band-solo and mode changes (see *Press / hold dynamics*).

Unlike the existing mixmachine device control (which drives Bitwig **remote controls**),
this feature drives the device's **direct parameters** by their stable PID strings — no
other class in the codebase does this yet, so a new direct-parameter tracker is the only
new Bitwig boundary the feature introduces.

### Activation & entry point

The feature is dormant until a FrequalizerAlt is the focused device. The pad layout is
expressed relative to a **quadrant origin**, not absolute pad notes, so it can be dropped
into any 4×4 quadrant — the intended home is the **top-right** quadrant, switched on when
the system detects that the selected device is a FrequalizerAlt. See *Activation* and
*Entry point*.

Notice that the FX pads are not active when we select a device, so the top right quadrant
is the perfect spot for the pad controls.

## Twister behavior

Encoders are numbered 1–16 (`EncoderTurned`/`EncoderButton*` convention), bottom-left to
top-right. The active **mode** chooses which six bands the 16 encoders target; the encoder
*positions* are identical across modes, only the underlying params change.

Per-band layout (declarative — see *Configuration*):

| band     | color      | freq enc | quality enc | gain enc | active toggle (click) | solo (hold) | filter shift              |
|----------|------------|----------|-------------|----------|-----------------------|-------------|---------------------------|
| Lowest   | blue       | 13       | 14          | —        | enc 13 button         | —           | —                         |
| Low      | red        | 1        | 5           | 9        | enc 9 button          | enc 5 button| hold enc 1 → enc 5 = filter |
| LowMids  | green      | 2        | 6           | 10       | enc 10 button         | enc 6 button| hold enc 2 → enc 6 = filter |
| HighMids | orange     | 3        | 7           | 11       | enc 11 button         | enc 7 button| hold enc 3 → enc 7 = filter |
| High     | yellow     | 4        | 8           | 12       | enc 12 button         | enc 8 button| hold enc 4 → enc 8 = filter |
| Highest  | bright red | 15       | 16          | —        | enc 15 button         | —           | —                         |

- **Turn** an encoder → set its band param (`RequestSetFrequalizerParam(id, value, 128)`,
  value is the raw 0–127 absolute encoder value — the Twister runs in absolute mode).
- **Click** a band's active-toggle button → flip that band's `ACTIVE` param (0↔1, range 2).
- **Hold** a band's solo button → set `BAND_SOLO` to that band's step; release → set it to 0.
- **Filter shift**: while a band's freq-encoder button is held, that band's quality encoder
  routes to the band's `FILTER` param instead of `QUALITY`. Input-only — no light change.

Encoder lighting:

- A band's encoders light in the band color **only while the band is active**; otherwise off.
- The ring of each mapped encoder shows the param's current normalized value (`value * 127`).
- While a band is **soloed**, every other encoder goes dark and only the soloed band lights.

The four edge-less main bands (Low / LowMids / HighMids / High) have freq/quality/gain,
solo and a filter shift. The two edge bands (Lowest / Highest) have only freq/quality and
an active toggle — no gain, no solo, no filter shift.

## Launchpad mode pads

Five pads in the quadrant set the device `Mode` param (range 5). Positions are quadrant-local —
1-indexed, left-to-right, bottom-to-top, so pad 1 is the bottom-left of the quadrant (same
convention as the Twister encoders above):

| local pad | mode      | mode step | lit when mode step ∈ |
|-----------|-----------|-----------|----------------------|
| 9         | Stereo    | 0         | {0}                  |
| 5         | Mid       | 1         | {1, 3}               |
| 6         | Side      | 2         | {2, 4}               |
| 1         | MidSolo   | 3         | {3}                  |
| 2         | SideSolo  | 4         | {4}                  |

A pressed mode pad selects its mode; the pad highlights reflect the mode the device reports
back. `Mid`/`MidSolo` both light the Mid pad, `Side`/`SideSolo` both light the Side pad,
because mid-solo is a sub-state of the mid view (and likewise for side).

It's important that we use the plugin as the source of truth for lighting these pads up, as
opposed to doing optimistic updates and keeping cached state (bad).

## Press / hold dynamics

The interesting behavior is that **lights are a function of device state, not of the gesture**.
Almost every gesture is a round-trip through a device parameter:

```
press pad / click / hold ─► RequestSetFrequalizerParam ─► Bitwig sets the direct param
                                                                    │
        ◄───────────────────────────────────────────────────────────
        device reports the new normalized value (FrequalizerParamsChanged)
                                                                    │
   FrequalizerCalculator re-decodes mode / active / solo and re-broadcasts the
   encoder + pad visual state ─► painters relight both surfaces
```

So:

- **Mode switch** (mode pad): `Mode` changes → calculator picks a new band set → all 16
  encoders relight for the new bands **and** the mode-pad highlights move. This is the whole
  relationship between the quadrant and the Twister — they communicate only through the
  device's `Mode` param.
- **Band active** (click): `ACTIVE` flips → that band's encoders light up or go dark.
- **Band solo** (hold): `BAND_SOLO` becomes that band's step → only the soloed band lights;
  releasing returns it to 0 and everything relights from the active state.
- **Filter shift** is the one exception — it never touches a param on press, it just reroutes
  the next turn of one encoder, so it lives purely in the input controller's held-button state.

## Impl

Follow the explorer/editor patterns. Communication — with Bitwig, with the hardware, and
between frequalizer classes — happens over the main event bus. The feature is a strict
one-way pipeline; the only state owner is the calculator.

### Dataflow

```
 Bitwig direct params ──►┌──────────────────────────────┐◄── RequestSetFrequalizerParam
 (own cursor device)     │     BitwigFrequalizerTracker   │
 device name ───────────►│   (name + direct-param boundary)│
                         └───────────────┬────────────────┘
                       FrequalizerActivated │ FrequalizerParamsChanged
                                            ▼
                         ┌──────────────────────────────┐
                         │      FrequalizerCalculator     │  the reducer — owns ALL
                         │  decode mode / active / solo /  │  decoded state
                         │  ring values (FrequalizerDecoder)│
                         └──┬─────────────┬──────────────┬─┘
   FrequalizerModeChanged │ FrequalizerModePadsChanged │ FrequalizerEncodersChanged
              ┌───────────┘             │              └────────────┐
              ▼                         ▼                           ▼
   FrequalizerTwisterInputCtl   FrequalizerModeCtl         FrequalizerTwisterPainter
   (turns/buttons →             (paint quadrant pads +      (FrequalizerEncodersChanged →
    RequestSetFrequalizerParam)  click → Request…)           PaintEncoder / SetEncoderValue)
```

Two roles, kept apart (as in the explorer):

- **Calculation** consumes domain events and emits *data* events. Never paints.
- **Painting** consumes data events and emits *only* hardware paint events
  (`PaintEncoder`, `SetEncoderValue`, `PaintPad`). Never calculates.

Input controllers translate hardware gestures into the `RequestSetFrequalizerParam` events
the tracker applies, closing the loop over the bus. Every class gates all work on the
feature being active (see *Activation*); the calculator only broadcasts while active and
re-broadcasts a fresh frame on activation, and a cleared frame on deactivation so painters
blank both surfaces.

### Configuration (declarative, behavior-free)

The mappings the javascript hard-codes must become declarative config, separate from
behavior (per `frequalizer-mappings.todo`: "mapping code should be declarative … behavior
code should be properly separated from configuration").

- **`FrequalizerParams`** — the PID table. Port `FREQ_PARAM_IDS` from `FrequalizerDevice.js`
  verbatim (global `MODE`, `BAND_SOLO`; `Q1..Q18` × `ACTIVE/FREQ/QUALITY/GAIN/FILTER`). IDs
  are matched after stripping the `ROOT_GENERIC_MODULE/` prefix Bitwig prepends.
- **`FrequalizerLayout`** — the band layout per mode and the mode-pad layout (the two tables
  above). Stereo uses Q1–Q6, Mid uses Q7–Q12, Side uses Q13–Q18. Provides pure lookups:
  encoder + mode → paramId, paramId → encoder, button → band, mode-pad → mode value.
- **`FrequalizerConstants` / `FrequalizerColors`** — `final` classes with private ctor, like
  `EditorConstants`/`EditorColors`: the device name to match, the encoder palette per band,
  the mode-pad selected/deselected colors, and the quadrant origin.

### FrequalizerDecoder (pure logic)

A stateless decoder mirroring `FrequalizerDevice.js`'s value math: `normalizedToStep(value,
range) = round(value * (range-1))`, `Mode` from the `MODE` value (range 5), soloed band from
the `BAND_SOLO` value (range 19, steps 1–6 stereo / 7–12 mid / 13–18 side, 0 = none), and a
band's active flag from an `ACTIVE` value (`>= 0.5`). No bus, no Bitwig.

### FrequalizerCalculator (the reducer)

The single source of the feature's visual state. Subscribes to and caches:

- `FrequalizerActivated` (gate — only computes/broadcasts while active)
- `FrequalizerParamsChanged` (the changed direct-param normalized values)

On any change it decodes the cached params via `FrequalizerDecoder` + `FrequalizerLayout`
and broadcasts:

- `FrequalizerEncodersChanged` — 16 encoder slots `{ color, ring }` (color 0 = off): each
  mapped encoder gets its band color when the band is active (or only the soloed band when a
  solo is in effect) and a ring from its param value.
- `FrequalizerModePadsChanged` — the five mode-pad slots `{ localPad, color }` lit per the
  table above.
- `FrequalizerModeChanged` — the decoded `Mode`, consumed by the Twister input controller so
  it can resolve encoder turns against the active band set.

Because it owns all the state, it has no dependency on subscription order. It computes only
while active; activation triggers a fresh broadcast, deactivation a cleared one.

### Painting classes

#### FrequalizerTwisterPainter

Subscribes to `FrequalizerEncodersChanged` and emits `PaintEncoder` + `SetEncoderValue` for
the 16 encoders. On deactivation, clears all 16. Emits nothing else, calculates nothing.

#### FrequalizerModeCtl

The quadrant's mode pads — a view + input class (like `ExplorerPageCtl`). It paints the five
pads from `FrequalizerModePadsChanged` (mapping quadrant-local positions → launchpad notes
via the quadrant origin) and turns a `PadClicked` on one of its pads into
`RequestSetFrequalizerParam(MODE, modeValue, 5)`. Owns no mode state — the highlight comes
from the broadcast. Clears its quadrant on deactivation.

### Input controllers

#### FrequalizerTwisterInputCtl

Caches the active `Mode` (`FrequalizerModeChanged`) and the set of currently-held encoder
buttons (`EncoderButtonPressed`/`Released`). Translates:

- `EncoderTurned(n, v)` → `RequestSetFrequalizerParam(paramId, v, 128)`, where `paramId` is
  resolved from `FrequalizerLayout` for `(encoder n, mode)` — substituting the band's `FILTER`
  param when the band's freq-encoder button is held (filter shift).
- a press of a band's active button → `RequestSetFrequalizerParam(ACTIVE, on?0:1, 2)` toggling
  from the last known active state.
- press/release of a band's solo button → `RequestSetFrequalizerParam(BAND_SOLO, step|0, 19)`.

Gates everything on active. Holds only transient input state (held buttons); the toggle's
"current" value comes from the cached decoded state, not from this class.

### Bitwig tracking

#### BitwigFrequalizerTracker

The only new Bitwig boundary. Creates its own cursor track + cursor device that follow the
native selection (as the js sandbox does), independent of mixmachine's. It is intentionally
dumb (the untestable boundary per `CLAUDE.md`); the decode/visual logic lives in the
calculator, which is driven over the bus and is fully testable.

- `cursorDevice.name()` + `exists()` (markInterested, observe) → drive activation: broadcast
  `FrequalizerActivated(true)` when the focused device matches `FrequalizerConstants.DEVICE_NAME`
  ("FrequalizerAlt"), `false` otherwise.
- `addDirectParameterNormalizedValueObserver((id, value) -> …)` → accumulate dirty params
  (strip the `ROOT_GENERIC_MODULE/` prefix) and broadcast `FrequalizerParamsChanged` with the
  changed `{ id, normalized }` entries on `flush()` (dirty-flag pattern, like the other trackers).
- `addDirectParameterIdObserver` is used to confirm the expected PIDs exist (a hardening check;
  v1 keys activation off the device name to match the js).
- handles `RequestSetFrequalizerParam(id, value, range)` →
  `cursorDevice.setDirectParameterValueNormalized(id, value, range)`.

### Activation

Source of truth for activation is the cursor-device name (covers selection by launchpad pad
**and** by mouse). When mixmachine's `LaunchpadDeviceCtl` selects a FrequalizerAlt pad, the
shared cursor selection moves, this tracker's device name becomes "FrequalizerAlt", and it
broadcasts `FrequalizerActivated(true)`. Every frequalizer class gates on this flag exactly
the way the mixmachine Ctls gate on `pageActive`.

Coexistence note: while active the feature owns the top-right quadrant (today
`LaunchpadGroupCtl`) and the Twister. `FrequalizerActivated` is the coordination signal those
mixmachine Ctls can yield to (the same way `LaunchpadFxCtl` yields on `RequestSelectDevice`).
Wiring that mutual exclusion — and the choice of quadrant — is the integration step the
quadrant-agnostic layout is built to support.

### Entry point

`Frequalizer(IEventBus bus, ControllerHost host)` is the composition root, mirroring
`Editor`/`Explorer`: it constructs the calculator, painters, input controllers and the
tracker (passing `bus`, and `host` to the tracker), holds only the tracker as a field, and
exposes `flush()` that forwards to `tracker.flush()`. It holds no state and subscribes to
nothing. `MixMachine` owns it the way it owns its other members — construct it in the
`MixMachine` constructor (`frequalizer = new Frequalizer(bus, host)`) and forward to
`frequalizer.flush()` from `MixMachine.flush()`. It still talks to the rest of mixmachine
only through bus events, never direct calls.

### Testing

Test behavior through the bus with a `FakeEventBus`, as the rest of the system does: send
`FrequalizerActivated` + `FrequalizerParamsChanged` and assert on the `FrequalizerEncodersChanged`
/ `FrequalizerModePadsChanged` / `RequestSetFrequalizerParam` events emitted. The calculator,
decoder, layout, painters and input controllers are all driveable this way. `BitwigFrequalizerTracker`
is the Bitwig boundary and is left untested (no `_setX` hooks — see `CLAUDE.md`).
