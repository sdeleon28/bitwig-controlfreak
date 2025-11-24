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
