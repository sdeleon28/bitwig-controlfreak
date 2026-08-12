# Addressing device parameters

Reach a parameter inside a plugin, Bitwig device or device preset without
pinning to ids that rot.

## Don't use ids

`FrequalizerParams` hardcodes 90 entries like `"CONTENTS/PID5e65eb21"`. For a
device preset that id is a content hash — rebuild the preset and every one
renumbers. For a plugin it is vendor-assigned and free to change.

Dead ends, so nobody re-explores them:

- `createSpecificVst3Device(classId)` — the VST3 class UID is not exposed by the
  API, and PACE-wrapped bundles ship no `moduleinfo.json`.
- `createSpecificBitwigDevice(UUID)` — Bitwig's device UUIDs are unpublished.

## Address params by label

Bitwig streams `id -> name` per direct parameter, so the id resolves at runtime.

- `ParamIndex` — pure logic. Alias list to id. Squashes case, spacing and
  punctuation (`"Pitch (semi)"` answers to `"pitch semi"`). All aliases are tried
  exact before any is tried as a substring.
- `DeviceParams` — the Bitwig boundary over one `Device`.

```java
var params = new DeviceParams(device);          // in init(), once per device
String id = params.resolve(List.of("Transpose", "Semitones"));
params.write(id, target.offsetFor(semitones), target.span());
```

`write(id, value, outOf)` sets the fraction `value / outOf`. A param spanning
-24..+24 semitones is `write(id, semitones + 24, 48)`.

Bitwig's underlying `setDirectParameterValueNormalized(id, value, range)`
divides by `range - 1` — its "range" counts discrete *positions*, so 25
positions span 24 intervals. `DeviceParams.write` adds that interval back. Get
this wrong and the exact midpoint lands between two steps and snaps to the
neighbour, making the centre value unreachable (frequalizer's
`ACTIVE_RANGE = 2` for an on/off param is the same arithmetic: `1/(2-1) = 1.0`).

Two API constraints, both of which throw or silently do nothing if missed:

- Register `addDirectParameterIdObserver` **before**
  `addDirectParameterValueDisplayObserver`, or Bitwig throws *"add an observer to
  the direct parameter ids or mark them as interested first"*.
- Displayed values stay silent until `setObservedParameterIds` names the ids —
  `DeviceParams.watchDisplay` does this.

## Fact finding

With `PluginLogger.ACTIVE` on. Per device, 4 lines:

1. Select the device. Console prints `device: <name>` — that is the match string.
2. Move the param **hard left** — copy the log line.
3. Move it **hard right** — copy the log line.
4. Move it **one step right of centre** — copy the log line.

Read `value=`, not `display=` — the displayed value has been observed to stick
at its initial reading and lie. Worked example (Archetype Gojira X):

```
label="Transpose" value=0.0                 hard left   = -12 st
label="Transpose" value=1.0                 hard right  = +12 st
label="Transpose" value=0.5416666865348816  one step up = +1 st
```

One step is `0.5416… - 0.5 = 1/24`, so the param has 24 steps over 0..1 and
centre is 0.5 — a -12..+12 span at 1 st per step. `label=` is what addresses it;
`id=` is noise.

## Configuring a mapping

`transpose/TransposeMapping` is the worked example:

- a **default** target — the alias list covering most devices;
- an **overrides** table keyed by a device-name substring, holding only the
  devices the default gets wrong.

Add a row when a device misbehaves, not up front.

A wrong span is silent — the device moves, by the wrong amount. So the tracker
logs after each write:

```
[Transpose] verify "HyperTune Metal {T}" param "Transpose" reads 3 st (asked for 3 st)
```

Disagreement means the span is wrong. Nothing resolved means the log lists every
label mentioning pitch, trans or tune.

## Don't reach devices through a cursor

A `CursorDevice` follows the selection. Any feature driven from a controller
page that *itself* requires selecting something — the master track's encoders,
say — will drag its own cursors off the devices it means to write to the moment
the user engages it. Cursors are for "whatever is selected right now", not for
holding a reference.

Hold devices with a per-track `DeviceBank` instead. Bank devices are ordinary
`Device` proxies with the same direct-parameter API and they stay put.

The cost is affordable because the expensive observer is the one for direct
parameter *values*, which streams continuously. Ids and names burst once per
existing device and then go quiet, and empty bank slots cost nothing — so
`BitwigTransposeTracker` observes 64 tracks x 8 device slots and never touches
values at all.

## Selecting devices by name

Transpose opts devices in with a `{T}` suffix on the instance name, like the
`(N)`/`[N]` track conventions: no plugin ids, works for unknown devices, and one
instance can participate while another sits out. Use `DeviceMatcher`
(`createInstrumentMatcher`, `createNoteEffectMatcher`, …) only when the criterion
is categorical rather than per-instance.

## Refactoring the frequalizer onto this

`BitwigFrequalizerTracker` already speaks canonical ids; only addressing changes.

1. Give it a `DeviceParams` over its cursor device.
2. Replace `FrequalizerParams.id(n, "FREQ")` with
   `params.resolve(List.of("Band " + n + " Freq"))` — confirm real labels first.
   Repeated labels tie-break on the plugin's parameter order, which is band order.
3. Keep `FrequalizerParams` only for labels the plugin does not disambiguate.
