# Known issues

Latent problems we have hit and decided not to fix yet. Feature-level bugs live
in ROADMAP.todo — this file is for traps that will waste your time again if you
rediscover them from scratch.

Add an entry when you find something broken you are not fixing now. Delete the
entry when it is fixed.

## PluginLogger's `display=` column cannot be trusted

`PluginLogger` prints a `display=` field per direct parameter. It lies in two
distinct ways:

- The first burst after selecting a device prints `display=?`. The display
  observer is only armed (`setObservedParameterIds`) once the id array arrives,
  which is after those lines are logged.
- Afterwards it sticks. Observed live on Archetype Gojira X: the Transpose
  param reported `display=0 st` at every position including both extremes, while
  `value=` moved correctly across the full 0..1 range.

Suspected cause: arming the observer with *every* id of a large plugin (~138 on
Gojira X) exceeds some internal limit, so updates never stream. Untested.

**Do this instead:** read `value=` and derive the mapping arithmetically — see
`params/SPEC.md`, which works a full example. The `(reads ...)` field on
`[Transpose]` verify lines is subject to the same doubt; the fraction on the
same line is authoritative because it is what we computed and wrote.

## HyperTune reads high under global transpose

`HyperTuneStrategy` writes `(36 + downtune)/36` against a param measured at 0.0 =
-36 st and 1.0 = 0 st. The plugin lands a semitone or more above what was asked
for, and the error is not a constant: dropping the written value by 1/72 moved it
two semitones, which no linear -36..0 param can do.

Every reading so far is suspect — the plugin editor was being read mid-sweep, and
`display=` lies (above). Re-derive from settled readings: turn the encoder, stop,
wait for the `[Transpose]` line, then read the plugin. If it turns out non-linear,
`HyperTuneStrategy` is free to hardcode a value per semitone; that is what the
strategies exist for.

## Frequalizer pins itself to direct-parameter ids

`FrequalizerParams` hardcodes ~90 ids of the form `CONTENTS/PID5e65eb21`. For a
Bitwig device preset those are derived from the preset's contents, so rebuilding
the preset renumbers every one of them and the mapping silently stops working —
writes to a stale id go nowhere, with no error.

Not currently broken. The refactor onto label-based addressing is in
ROADMAP.todo and the procedure is in `params/SPEC.md`.

Note that `BitwigFrequalizerTracker` is *not* affected by the
`setDirectParameterValueNormalized` off-by-one described in `params/SPEC.md` —
its `*_RANGE` constants already count discrete positions, which is what Bitwig
divides by after subtracting one.

## BitwigSchemaTracker.flush leftovers

`flatTracks` is append-only, ordered by when each track first showed up. Two
known problems remain after the id/position crash fix:

- Track types are compared with `!=` (`t.trackType != "Master"`), which is
  reference equality on strings. It only works if Bitwig hands back interned
  strings.
- Tracks that stop existing (deleted) are never removed from `flatTracks`, and
  a track that appears after a higher-id one lands out of id order, which
  `getStructuredTracks` relies on for grouping.
