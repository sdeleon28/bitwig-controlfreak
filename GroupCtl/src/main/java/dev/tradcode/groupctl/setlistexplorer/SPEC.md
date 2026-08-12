# Setlist explorer spec

Built on `baseexplorer`, this view engages when the project defines at least one
complete `{ … }` song. It shows one song at a time instead of the whole project.

## The `{ }` convention

A cue marker whose name starts with `{` **opens** a song; the rest of the name
(trimmed) is its title. A marker whose name starts with `}` **closes** it. Any
marker in between is a **section**. Markers outside a `{ }` pair, an unclosed
opener, and an orphan closer are dropped. Parsing lives in `baseexplorer`'s
`SongParser` so the base coordinator and this view share one definition.

## Classes

- **SetlistGridCalculator** — the reducer. Groups markers into songs, tracks the
  current song, and lays it onto bars via **SongBarsCalculator** (opener beat to
  closer beat, colored by the active section; the closer bounds the span but
  never paints a bar). Runs the shared `GridPipeline`, so bar paging within a
  song reuses the base page mechanism. Broadcasts `ExplorerGridChanged`,
  `ContentBarsChanged` (the current song's bar count, for resolution auto-fit),
  `SetlistChanged` (the song titles) and `CurrentSongChanged`.
  - **Auto-follow**: while playing, crossing a song boundary switches the current
    song (silent — `manual = false`).
  - **Manual select** (`RequestSelectSong`, only fires while stopped): switches
    song, seeks the playhead to the song start, and marks it `manual` so it is
    growled.

## Controls

- **SongPagerCtl** — LEFT/RIGHT = previous/next song, cyan when a neighbour
  exists, dark and inert while playing (auto-follow owns switching then). Shares
  LEFT/RIGHT with the normal view's page pager, so it yields by ceasing to paint.
- **BarPagerCtl** — VOLUME/PAN side buttons = page bars within a long song, cyan
  when another 64-pad window exists. These buttons are the setlist's alone on
  this page, so it may blank them when not engaged. Emits `RequestExplorerPage`.
- **SetlistGrowlCtl** — SEND_A, lit while engaged; press growls the whole setlist.
- **SetlistGrowler** — growls the song name on a manual switch and the setlist on
  request.

MIXER stays the base selection toggle in both views; UP/DOWN are left to the
launchpad's program change.
