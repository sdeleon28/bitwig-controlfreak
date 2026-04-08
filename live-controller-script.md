# Live controller script

## description

create a controller script called Live that has a more focused functionality
for a flat project with up to 15 tracks.

i've mocked up a prototype of artisanal, hand-made, free-roaming, human written
code. It's a python prototype that lays out the basic functionality that I want
without actually implementing the controller script. Use that as the basis for
what the controller script should behave like.

## features

### main pager

main pager in up / down arrows allows you to move between the control page and
the project explorer

### control page

the control page consists of 4 quadrants:

* bottom left: rec arm quadrant
* bottom right: solo
* top right: mute
* top left: select, which should select the track and scroll it into view

i've used dummy colors for rec, solo and mute in `./live-prototype`, use the
ones from "Launchpad + Twister", instead.

### project explorer

project explorer should have basically the same functionality as we have in
"Launchpad + Twister" with some added functionality: the user can define song
boundaries withing a session by wrapping the song in the `{ songname` + `}` cue
markers. when the playhead is inside the boundaries of a song, the corresponding
markers are the ones used to display the grid. next / back arrows should allow
me to navigate the songs one by one (and repaint the available markers)

the project explorer is a bit more mature in the example controller scripts, so
use those examples for things like playback feedback, range selection, seeking,
functionality on the side buttons (loop, metronome, stop, etc)

use `./live-prototype` for an example of how to calculate the songs that are
available and how to page them. i tried to re-use some functionality across
different pagers. if you see that code getting more complex than it needs to be,
just copy/paste and separate the pagers instead. we'll also need a pager for
when we have more blocks than can fit in one launchpad page (this functionality
is available in "Launchpad + Twister". reconciliate all of these pagers and make
them consistent

when in project explorer mode, let's make it so pressing send A growls the set
list: extract the names for each song and present them one on each line, in
order. i'm not sure if it's possible to programaticallly determine when a growl
should disappear, but if possible make it so the list stays on until i press the
button again

### twister

twister functionality should be a stripped down version of the twister
functionality available in "Launchpad + Twister". encoders don't need to change
dynamically tho, they need to be linked to the corresponding 1..15 tracks (16
should be reserved for the master track). the only thing that should be dynamic
is the ability to change volume vs pan mode (using the volume and pan buttons
on the side, like we do un "Launchpad + Twister".

## code style

i've hand coded the prototype because i wanted to make sure we have a clean
separation of concerns, instances are properly injected into each other allowing
us to focus on one problem at a time.

notice i've coded the prototype in a way where consistent / correct behavior
matters more than performance. whenever there's a change to one of the tracks
i just repaint the entire control page (if currently active). the core idea
being that "UI is a pure function of state" so any change in state should 
generate the UI anew. if you can improve on this pattern, go ahead, but let's
not just make some local update when something changed to avoid bugs (just
repaint the whole thing).

also make sure it's architecturally impossible for one page's functionality to
leak into the other.

lean more on the python example for design desicions and lean on the existing
controller scripts to get your API ideas from.

## inputs and outputs

the "Live" contoller should only require my launchpad and the midi fighter
twiister.

# gameplan

[ ] scaffold the script
    [ ] create Live.control.js with loadAPI, defineController, defineMidiPorts(2,2)
    [ ] create live/ directory
    [ ] write live/Pager.js — stripped-down PagerHW (requestPaint + flashing/pulsing, switchToPage, isPageActive)
    [ ] write live/Launchpad.js — minimal: setPadColor, setTopButtonColor, registerPadBehavior, gesture detection, color palette, bitwigColorToLaunchpad
    [ ] write live/Twister.js — minimal: setEncoderColor, linkEncoderToTrack (volume + pan helpers)
    [ ] write live/Bitwig.js — minimal: init wiring, top-level track bank (16), transport, marker bank (size 256), time selection helpers, onTracksUpdated/onMarkersUpdated event propagation
    [ ] copy BitwigActions.js into live/ as-is (action id constants are stable)
    [ ] wire load() order in Live.control.js
    [ ] register in Bitwig controllers; confirm loads cleanly
[ ] implement the control page
    [ ] write live/Page_Control.js (includes LiveQuadrant base class + 4 subclasses RecArm, Solo, Mute, Select; kept in one file because Bitwig's loader treats class declarations across loaded files as one shared lexical scope and cross-file `extends` is fragile)
    [ ] quadrants use bitwigColorToLaunchpad for track color and palette constants for state colors
    [ ] on any onTracksUpdated, repaint the whole page (pure-function style)
    [ ] add (N) regex scan of top-level track bank to discover up to 15 tracks
    [ ] test: clicks toggle rec/solo/mute/select; state reflects in Bitwig; Page_Control.test.js passes
[ ] implement the main pager (page switcher)
    [ ] write live/MainPager.js hooking up/down top buttons (cc 104/105)
    [ ] integrate with PagerHW.switchToPage
    [ ] test: up/down switches cleanly; no cross-page leakage
[ ] implement marker grouping into songs
    [ ] write live/MarkerSets.js: groupMarkers(markers) -> [{name, markers:[...]}, ...]
    [ ] add findSongContainingBeat(sets, beat) helper
    [ ] pure functions — use fake bank in tests
    [ ] test: MarkerSets.test.js covers empty, single song, multiple songs, malformed
[ ] implement the project explorer
    [ ] write live/Page_ProjectExplorer.js
    [ ] port autoResolution + buildPadLayout from ProjectExplorer.js
    [ ] paint a single song's markers with reversed-row orientation
    [ ] write live/SongPager.js for left/right (cc 106/107) song navigation
    [ ] hook playhead observer to auto-follow song boundaries (manual seek + playback)
    [ ] subscribe to onMarkersUpdated to recompute + repaint on any marker change
    [ ] port updatePlayheadIndicator for flashing playhead pad
    [ ] port seek-on-click via marker.launch(true)
    [ ] manual zoom via cc 108 (decrease) / cc 109 (increase) — resets to auto on song switch
    [ ] test: songs page correctly; playhead flashes; seek works
[ ] add bar paging within a song (when song doesn't fit on 64 pads)
    [ ] write live/BarPager.js using top buttons cc 110 (prev) / cc 111 (next)
    [ ] test: force a long song; verify pages cleanly
[ ] port loop range + time-selection gesture
    [ ] bring isPadInLoopRange and handleTimeSelect* logic over
    [ ] hook arrangerLoop observers
    [ ] test: time selection writes loop; loop range highlights white
[ ] wire side buttons for transport/loop/metronome/setlist
    [ ] stop (note 49) -> BitwigActions.STOP
    [ ] solo (note 29) -> BitwigActions.TOGGLE_ARRANGER_LOOP
    [ ] mute (note 39) -> BitwigActions.TOGGLE_METRONOME
    [ ] sendA (note 69) -> growl setlist (host.showPopupNotification, single shot)
    [ ] test: each button triggers the right action
[ ] twister static linking
    [ ] scan top-level tracks for (N), link encoders 1-15
    [ ] link encoder 16 to master track
    [ ] test: turning encoders affects corresponding tracks
[ ] twister volume/pan mode toggle
    [ ] extend live/Twister.js with a pan-binding helper
    [ ] write live/ModeSwitcher.js — wire launchpad volume (note 89) / pan (note 79) side buttons
    [ ] test: mode switches; encoders follow mode
[ ] final integration test
    [ ] run through all manual smoke tests
    [ ] run `just test`; all unit tests green
