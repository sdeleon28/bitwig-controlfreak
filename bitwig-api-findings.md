# Bitwig Control Surface API Findings

Documentation of discoveries made while developing the Launchpad MK2 / MIDI Fighter Twister controller script.

## API Version

**Using API Version 24** (`loadAPI(24)`)

⚠️ **Important**: Always use API v24. Do not revert to older versions.

## Key API Patterns

### 1. Observer Setup Pattern

Before accessing values with `.get()`, you **must** call `markInterested()`:

```javascript
// CORRECT
marker.position().markInterested();
var pos = marker.position().get();  // Works!

// INCORRECT
var pos = marker.position().get();  // Error: Call markInterested() first
```

### 2. Closure Capture Pattern

When using variables in callbacks, use IIFE to capture by value:

```javascript
// CORRECT
for (var i = 0; i < 16; i++) {
    (function(markerIndex) {
        marker.exists().addValueObserver(function(exists) {
            // markerIndex is captured correctly
            LaunchpadLane.refresh();
        });
    })(i);
}

// INCORRECT
for (var i = 0; i < 16; i++) {
    marker.exists().addValueObserver(function(exists) {
        // All callbacks will see i = 16!
        println(i);
    });
}
```

### 3. Scheduled Tasks Cannot Be Cancelled

`host.scheduleTask()` returns `void` - tasks cannot be cancelled once scheduled.

**Solution**: Use timestamp-based approach:

```javascript
// Record press time
var pressTime = Date.now();

// On release, calculate duration
var holdDuration = Date.now() - pressTime;
if (holdDuration >= 400) {
    // Hold action
} else {
    // Click action
}
```

## Cue Markers API

### Creating Marker Bank

Markers are accessed through the Arranger object:

```javascript
var arranger = host.createArranger();
var markerBank = arranger.createCueMarkerBank(16);  // 16 markers
```

### Accessing Marker Properties

```javascript
var marker = markerBank.getItemAt(0);

// Check if marker exists
marker.exists().markInterested();
if (marker.exists().get()) {
    // Access properties
}

// Get marker position (in beats)
marker.position().markInterested();
var pos = marker.position().get();

// Get marker color (returns RGB via callback)
marker.getColor().markInterested();
marker.getColor().addValueObserver(function(red, green, blue) {
    // Color values: 0.0 to 1.0
});
```

### Marker Observers

```javascript
// Observe marker existence
marker.exists().addValueObserver(function(exists) {
    if (exists) {
        println("Marker now exists");
    }
});

// Observe color changes
marker.getColor().addValueObserver(function(red, green, blue) {
    println("Color changed: " + red + ", " + green + ", " + blue);
});
```

## Transport & Time Selection API

### Setting Time Selection (Loop Range)

The time selection is controlled via transport's loop start/duration:

```javascript
var transport = host.createTransport();

// Set loop start
var loopStart = transport.arrangerLoopStart();
if (loopStart && loopStart.set) {
    loopStart.set(startBeats);  // Position in beats
}

// Set loop duration (not end position!)
var loopDuration = transport.arrangerLoopDuration();
if (loopDuration && loopDuration.set) {
    loopDuration.set(endBeats - startBeats);  // Duration in beats
}
```

### Setting Playhead Position

```javascript
transport.setPosition(beats);  // Set playhead to position in beats
```

### Arrangement Recording

```javascript
var recordEnabled = transport.isArrangerRecordEnabled();
if (recordEnabled && recordEnabled.set) {
    recordEnabled.set(true);  // Enable arrangement recording
}
```

## Arranger Scroll Investigation

### Problem

We need to programmatically scroll the arranger view to show a specific time position.

### What We Tried

#### 1. Horizontal Scrollbar Model ❌

```javascript
var scrollbar = arranger.getHorizontalScrollbarModel();
scrollbar.set(beats);  // Doesn't work
```

**Result**: The scrollbar model is for **zoom control**, not scroll position. It has no `get()` or `set()` methods for position.

#### 2. Zoom to Selection ❌

```javascript
// Set time selection
transport.arrangerLoopStart().set(startPos);
transport.arrangerLoopDuration().set(duration);

// Try to zoom/scroll to it
arranger.zoomToSelection();  // Doesn't scroll
```

**Result**: `zoomToSelection()` exists but doesn't scroll the view as expected.

#### 3. Playback Follow ❌

```javascript
// Check if playback follow is enabled
var followEnabled = arranger.isPlaybackFollowEnabled();

// Toggle it
arranger.togglePlaybackFollow();
```

**Result**: Playback follow only works **during playback**. Setting playhead position while stopped doesn't trigger scroll.

#### 4. Application Panel Methods ❌

```javascript
var app = host.createApplication();
// app has focusPanelAbove(), focusPanelBelow(), etc.
// But nothing for arranger scroll position
```

**Result**: Application object has panel focus methods but no arranger position control.

#### 5. Arranger Cursor Clip ❌

```javascript
var cursorClip = host.createArrangerCursorClip(4, 128);

// Try to position it
var playStart = cursorClip.getPlayStart();
playStart.set(markerPos);  // Sets position

// Try to show it
cursorClip.showInEditor();  // NullPointerException
```

**Result**: `showInEditor()` throws `NullPointerException` - cursor clip not tracking anything.

### Conclusion

**Programmatic arranger scrolling is not possible** in Control Surface API v24.

The API provides no reliable way to:
- Scroll the arranger view to a specific time position
- Make a time position visible in the arranger
- Control arranger horizontal scroll position

**Workarounds**:
- Enable playback follow and play briefly (hacky, not recommended)
- Ask user to manually scroll to position
- Accept that scroll doesn't happen

## Detective Script Approach

When the API is undocumented or unclear, use detective scripts to discover correct methods:

```javascript
function testAPI() {
    var obj = getSomeObject();

    // List all methods
    for (var prop in obj) {
        if (typeof obj[prop] === 'function') {
            println("obj." + prop + "()");
        }
    }

    // Test suspected methods
    try {
        obj.suspectedMethod();
        println("SUCCESS!");
    } catch (e) {
        println("FAILED: " + e);
    }

    // Search for keywords
    for (var prop in obj) {
        var lowerProp = prop.toLowerCase();
        if (lowerProp.indexOf('keyword') !== -1) {
            println("Found: " + prop);
        }
    }
}
```

### Examples That Worked

1. **Finding marker color method**:
   - Tried: `marker.color()` ❌
   - Found: `marker.getColor()` ✅

2. **Finding loop time methods**:
   - Tried: `transport.setLoopStart()` ❌
   - Found: `transport.arrangerLoopStart().set()` ✅

3. **Finding marker bank**:
   - Tried: `host.createCueMarkerBank()` ❌
   - Found: `arranger.createCueMarkerBank()` ✅

## Common Pitfalls

### 1. API Version Mismatches

Methods available in v24 may not exist in v17. Always check API version.

### 2. Forgetting markInterested()

Most observable values throw errors if you call `.get()` without first calling `markInterested()`.

### 3. Object Creation Outside init()

Some objects (like `host.createApplication()`) can only be created during the `init()` phase.

```javascript
// CORRECT
function init() {
    var app = host.createApplication();  // OK
}

// INCORRECT
function someFunction() {
    var app = host.createApplication();  // Error!
}
```

### 4. Confusing Loop Start/End vs Duration

Transport uses **start + duration**, not start + end:

```javascript
// CORRECT
transport.arrangerLoopStart().set(8);
transport.arrangerLoopDuration().set(8);  // 8 to 16

// INCORRECT
transport.arrangerLoopStart().set(8);
transport.arrangerLoopEnd().set(16);  // No such method!
```

## Useful Host Methods

```javascript
// Core objects
host.createArranger()
host.createApplication()
host.createTransport()
host.createMainTrackBank(numTracks, numSends, numScenes)

// Cursors
host.createArrangerCursorTrack()
host.createArrangerCursorClip(numSteps, numKeys)
host.createCursorTrack()
host.createCursorDevice()

// Utilities
host.scheduleTask(callback, context, delayMs)
host.println(text)
```

## Useful Arranger Methods

```javascript
arranger.createCueMarkerBank(numMarkers)
arranger.isPlaybackFollowEnabled()
arranger.togglePlaybackFollow()
arranger.zoomToSelection()
arranger.zoomToFit()
arranger.isTimelineVisible()
arranger.toggleCueMarkerVisibility()
```

## Useful Transport Methods

```javascript
transport.setPosition(beats)
transport.playPosition()
transport.arrangerLoopStart()
transport.arrangerLoopDuration()
transport.isArrangerRecordEnabled()
transport.isPlaying()
transport.play()
transport.stop()
```

## Roland Piano Transpose Feature with nanoKEY2 Key Selection

### Problem

Need to transpose MIDI from Roland Digital Piano by ±x semitones without adding pitch plugins to every track. User plays in Db major but wants to easily transpose to any key.

### Solution

Use `setKeyTranslationTable()` on a dedicated NoteInput to globally transpose MIDI from a specific port. Use nanoKEY2 as a key selector to control the transpose amount.

### Implementation

#### RolandPiano Namespace (Transpose Engine)

```javascript
var RolandPiano = {
    _noteInput: null,
    _transposeOffset: 0,

    init: function() {
        // Create dedicated note input on port 2
        this._noteInput = host.getMidiInPort(2).createNoteInput("Roland Piano (Transposed)", "??????");

        // Take full control of this MIDI port
        this._noteInput.setShouldConsumeEvents(true);
    },

    setTranspose: function(semitones) {
        this._transposeOffset = semitones;

        // Build key translation table (128 MIDI notes)
        var table = [];
        for (var i = 0; i < 128; i++) {
            var transposed = i + semitones;
            // Clamp to valid MIDI range (0-127)
            if (transposed < 0) transposed = 0;
            if (transposed > 127) transposed = 127;
            table[i] = transposed;
        }

        // Apply translation
        this._noteInput.setKeyTranslationTable(table);
    }
};
```

#### NanoKey2 Namespace (Key Selector)

```javascript
var NanoKey2 = {
    keyMap: {
        48: { name: "C", semitones: -1 },    // C -> transpose -1
        49: { name: "Db", semitones: 0 },    // Db -> no transpose (native key)
        50: { name: "D", semitones: 1 },     // D -> transpose +1
        51: { name: "Eb", semitones: 2 },    // Eb -> transpose +2
        52: { name: "E", semitones: 3 },     // E -> transpose +3
        53: { name: "F", semitones: 4 },     // F -> transpose +4
        54: { name: "F#", semitones: 5 },    // F# -> transpose +5
        55: { name: "G", semitones: 6 },     // G -> transpose +6
        56: { name: "G#", semitones: -6 },   // G# -> transpose -6 (enharmonic)
        57: { name: "A", semitones: -4 },    // A -> transpose -4
        58: { name: "Bb", semitones: -3 },   // Bb -> transpose -3
        59: { name: "B", semitones: -2 }     // B -> transpose -2
    },

    _noteInput: null,
    _currentKey: "Db",

    init: function() {
        // Create note input for key selection on port 3
        this._noteInput = host.getMidiInPort(3).createNoteInput("nanoKEY2 - Key Selector", "??????");

        // Consume events so keys don't play notes
        this._noteInput.setShouldConsumeEvents(true);
    },

    handleKeySelection: function(midiNote) {
        var keyInfo = this.keyMap[midiNote];
        if (!keyInfo) return;  // Outside C-B range

        this._currentKey = keyInfo.name;
        RolandPiano.setTranspose(keyInfo.semitones);

        // Show notification in Bitwig
        host.showPopupNotification("Key: " + keyInfo.name + " Major");
    }
};
```

#### MIDI Setup in init()

```javascript
function init() {
    // ... other init code ...

    // Initialize Roland Piano transpose (port 2)
    RolandPiano.init();

    // Initialize nanoKEY2 key selector (port 3)
    NanoKey2.init();

    // Set up MIDI callback for nanoKEY2
    host.getMidiInPort(3).setMidiCallback(function(status, data1, data2) {
        // Handle note on messages for key selection
        if (status === 0x90 && data2 > 0) {
            NanoKey2.handleKeySelection(data1);
        }
    });
}
```

### Key Concepts

1. **Port Configuration**: Requires 4 MIDI ports:
   - Port 0: Launchpad MK2
   - Port 1: MIDI Fighter Twister
   - Port 2: Roland Digital Piano
   - Port 3: nanoKEY2

2. **Note Input Names**:
   - "Roland Piano (Transposed)" - the transposed input for recording/playing
   - "nanoKEY2 - Key Selector" - consumes C-B keys for key selection

3. **setShouldConsumeEvents(true)**: Both Roland Piano and nanoKEY2 inputs use this to take full control

4. **Key Translation Table**: Array of 128 integers mapping input MIDI notes to output MIDI notes

5. **Key Selection**: Press keys on nanoKEY2 to select major or minor keys:

   **Major Keys (First octave: C3-B3, MIDI 48-59)**:
   - C (48): -1 semitone → C Major
   - Db (49): 0 semitones (native key) → Db Major
   - D (50): +1 semitone → D Major
   - ... up to B (59): -2 semitones → B Major

   **Minor Keys (Second octave: C4-B4, MIDI 60-71)**:
   - C (60): +2 semitones → C Minor (uses Eb Major transpose)
   - Db (61): +3 semitones → Db Minor (uses E Major transpose)
   - D (62): +4 semitones → D Minor (uses F Major transpose)
   - ... up to A (69): -1 semitone → A Minor (uses C Major transpose)
   - ... up to B (71): +1 semitone → B Minor (uses D Major transpose)

   Each minor key uses the transpose of its relative major (3 semitones higher)

6. **Bitwig Notifications**: Use `host.showPopupNotification(message)` to show key selection feedback

7. **Global Effect**: Translation applies to all tracks receiving from "Roland Piano (Transposed)" input

### Workflow

1. Configure ports in Bitwig controller settings:
   - Port 2: Roland Digital Piano
   - Port 3: nanoKEY2
2. On tracks where you want transposed piano, select "Roland Piano (Transposed)" as MIDI input
3. Press a key on nanoKEY2 to select the target key:
   - **First octave (C3-B3)**: Select major keys
   - **Second octave (C4-B4)**: Select minor keys
4. Bitwig shows notification: "Key: [name] Major" or "Key: [name] Minor"
5. Play Db major shapes on Roland Piano, outputs in selected key/mode

### Gotchas

- Must call `setShouldConsumeEvents(true)` or MIDI won't come through properly
- Disable generic "Roland Digital Piano" controller in Bitwig to avoid conflicts
- nanoKEY2 keys in first two octaves (MIDI 48-71) don't produce notes when pressed (consumed for key selection)
- Keys outside the two key selection octaves on nanoKEY2 will pass through normally
- Translation is global - affects all tracks using "Roland Piano (Transposed)" input
- Both original "Roland Digital Piano" and "Roland Piano (Transposed)" inputs are visible
- Minor keys use the same transpose as their relative major (e.g., A Minor = C Major transpose)

## Resources

- **Bitwig Studio Control Surface Scripting Guide**: Limited documentation
- **Detective Script Approach**: When in doubt, enumerate and test
- **Community Forums**: Other developers share discoveries

## Summary

The Bitwig Control Surface API v24 is powerful but sparsely documented. Key strategies:

1. **Always use markInterested()** before calling `.get()`
2. **Use IIFE pattern** for capturing variables in callbacks
3. **Use detective scripts** to discover correct API methods
4. **Accept API limitations** - some features (like arranger scroll) simply aren't available
5. **Check object parent hierarchy** - methods often on parent object (e.g., markers on arranger, not host)

When the documentation fails, systematic exploration and testing is the only reliable approach.
