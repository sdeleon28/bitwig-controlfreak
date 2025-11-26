# Clip Launcher Future Enhancements

This document outlines planned enhancements and feature requests for the Launchpad MK2 clip launcher implementation.

## Priority 1: Core Navigation

### 1.1 Track Bank Scrolling

**Requirement**: Allow navigation beyond the first 8 tracks

**Implementation Ideas**:
- Use side buttons (right column) for track bank navigation
  - Up/Down buttons: Scroll track bank by 1
  - Alternative: Scroll by 8 (full page)
- Visual feedback showing current track bank position
- Consider using right-side buttons 1-8 for direct track selection

**API Methods**:
```javascript
trackBank.scrollForwards()
trackBank.scrollBackwards()
trackBank.scrollBy(amount)
trackBank.canScrollForwards().addValueObserver()
trackBank.canScrollBackwards().addValueObserver()
```

### 1.2 Scene Bank Scrolling

**Requirement**: Navigate through more than 7 scenes

**Implementation Ideas**:
- Use top buttons (106/107 - Bar Back/Forward) for scene scrolling
- Alternatively, use dedicated scene scroll buttons
- Show scene bank position indicator

**API Methods**:
```javascript
var sceneBank = trackBank.sceneBank();
sceneBank.scrollForwards()
sceneBank.scrollBackwards()
sceneBank.scrollBy(amount)
```

### 1.3 Scene Launch

**Requirement**: Launch entire scenes (all clips in a row)

**Implementation Ideas**:
- Use right-side buttons (column 9) for scene launch
- Map buttons 1-7 to scenes 0-6
- Provide visual feedback when scene is queued/launching
- Consider scene stop button (button 8?)

**API Methods**:
```javascript
var scene = sceneBank.getItemAt(index);
scene.launch()
scene.showInEditor()
```

## Priority 2: Recording and Clip Management

### 2.1 Clip Recording

**Requirement**: Start recording new clips directly from Launchpad

**Implementation Ideas**:
- Hold + press empty slot to arm recording
- Press armed slot to start recording
- Auto-record when pressing empty slot if track is armed
- Visual distinction between record-armed slots and recording slots

**API Methods**:
```javascript
slot.record()
track.arm()
track.arm().toggle()
```

### 2.2 Session Recording

**Requirement**: Trigger Bitwig's session record functionality

**Implementation Ideas**:
- Dedicate a top button or side button to session record
- Visual feedback showing session record state
- Integration with transport record state

**API Methods**:
```javascript
var transport = host.createTransport();
transport.isClipLauncherOverdubEnabled()
transport.isArrangerRecordEnabled()
```

### 2.3 Clip Overdub Mode

**Requirement**: Control overdub mode for clip recording

**Implementation Ideas**:
- Toggle button for overdub mode
- Visual indicator when overdub is active
- Per-track or global mode

## Priority 3: Alternative Row Modes

### 3.1 Mode Switching System

**Requirement**: Repurpose bottom row (Row 1) for different functions

**Proposed Modes**:
1. **Stop Mode** (current default): Stop track playback
2. **Arm Mode**: Arm tracks for recording
3. **Solo Mode**: Solo/unsolo tracks
4. **Mute Mode**: Mute/unmute tracks
5. **Select Mode**: Select tracks in Bitwig

**Implementation Ideas**:
- Use mode buttons in bottom-left quadrant (if available)
- Show current mode with color-coded row 1 pads
- Modes persist when switching pages
- Visual feedback:
  - Arm mode: Red for armed tracks
  - Solo mode: Yellow for soloed tracks
  - Mute mode: Orange/off for muted tracks
  - Select mode: Track color for selected track

**API Methods**:
```javascript
track.arm().get()
track.arm().toggle()
track.solo().get()
track.solo().toggle()
track.mute().get()
track.mute().toggle()
track.selectInEditor()
```

### 3.2 Track Selection

**Requirement**: Select tracks in Bitwig from the Launchpad

**Implementation Ideas**:
- Dedicated "Select" mode for row 1
- Visual feedback showing currently selected track
- Auto-scroll track bank to keep selected track visible

## Priority 4: Visual Enhancements

### 4.1 Pulsing Animation

**Requirement**: Pulsing colors for queued/playing clips

**Implementation Ideas**:
- Use `host.scheduleTask()` for periodic updates
- Pulse brightness for queued clips
- Pulse white mix for playing clips
- Configurable pulse rate (e.g., every 500ms)

**Technical Approach**:
```javascript
var pulseState = false;
host.scheduleTask(function() {
    pulseState = !pulseState;
    ClipLauncher.updatePlayingClips(pulseState);
}, null, 500);
```

### 4.2 Brightness Levels

**Requirement**: Use Launchpad velocity for brightness levels

**Implementation Ideas**:
- Low brightness for clips with content (not playing)
- Medium brightness for queued clips
- High brightness for playing clips
- Maximum brightness for recording clips

### 4.3 Track State Indicators

**Requirement**: Show track arm/solo/mute states on the grid

**Implementation Ideas**:
- Overlay indicators on pads (small corner LEDs)
- Use specific colors for track state
- Combine with clip colors using color mixing

## Priority 5: Performance Features

### 5.1 Quantization Control

**Requirement**: Control launch quantization from Launchpad

**Implementation Ideas**:
- Dedicated button to cycle through quantization settings
- Visual feedback showing current quantization
- Options: None, 1 bar, 1/2, 1/4, 1/8, 1/16

**API Methods**:
```javascript
track.clipLauncherSlotBank().setLaunchQuantization(quantization)
// Values: "none", "8_bars", "4_bars", "2_bars", "1_bar", "1/2", "1/4", "1/8", "1/16"
```

### 5.2 Return to Arrangement

**Requirement**: Return tracks to arrangement playback

**Implementation Ideas**:
- Global "Return to Arrangement" button
- Per-track return to arrangement (shift + stop?)
- Visual indicator showing which tracks are playing clips vs. arrangement

**API Methods**:
```javascript
track.returnToArrangement()
```

### 5.3 Clip Stop/Retrigger

**Requirement**: Advanced clip control options

**Implementation Ideas**:
- Press playing clip to stop it
- Double-press to retrigger from start
- Hold + press for legato mode
- Configurable behavior

## Priority 6: Advanced Features

### 6.1 Clip Slots Bank Size

**Requirement**: Support more than 7 scenes per track

**Implementation Ideas**:
- Increase internal scene bank size
- Scene scrolling becomes more important
- Consider page-based scene navigation (8 scenes at a time)

### 6.2 Group Track Support

**Requirement**: Navigate into/out of group tracks

**Implementation Ideas**:
- Integration with existing group selection feature on page 1
- Button to enter/exit groups
- Visual breadcrumb showing current group hierarchy
- Clip launcher shows tracks within current group

### 6.3 Fixed-Length Recording

**Requirement**: Record clips with fixed length

**Implementation Ideas**:
- Set fixed length before recording (1/2/4/8 bars)
- Visual countdown during recording
- Auto-loop when length is reached

**API Methods**:
```javascript
track.clipLauncherSlotBank().createEmptyClip(slotIndex, lengthInBeats)
```

### 6.4 Clip Delete/Clear

**Requirement**: Delete clips from Launchpad

**Implementation Ideas**:
- Hold delete button + press clip to delete
- Confirmation feedback (flash red?)
- Cannot be undone - requires care

**API Methods**:
```javascript
slot.deleteObject()
```

### 6.5 Clip Duplicate

**Requirement**: Duplicate clips to other slots

**Implementation Ideas**:
- Hold source clip + press destination
- Visual feedback showing duplicate operation
- Works within same track or across tracks

**API Methods**:
```javascript
slot.replaceInsertionData(otherSlot)
```

## Priority 7: Integration Features

### 7.1 Transport Integration

**Requirement**: Show transport state on clip launcher page

**Implementation Ideas**:
- Top button LED shows play/stop state
- Metronome on/off indicator
- Tempo tap button

### 7.2 Mixer Integration

**Requirement**: Quick access to mixer controls

**Implementation Ideas**:
- Mode for volume control (use MIDI Fighter Twister?)
- Track pan control
- Send levels
- Keep clip launcher visual on pads while controlling mixer with encoders

### 7.3 Cross-Page Features

**Requirement**: Clip launcher features accessible from other pages

**Implementation Ideas**:
- Global scene launch (works on all pages)
- Global stop all clips
- Transport controls work on all pages (already implemented)

## Implementation Notes

### API Exploration Needed

Some features require API exploration to determine the correct methods:

1. **Clip color override**: Can we set clip colors from the API?
2. **Clip length detection**: Can we read clip length to show on grid?
3. **Looping state**: Can we detect/control clip loop state?
4. **Clip launch modes**: Can we access Bitwig's trigger/gate/toggle/repeat modes?

### Performance Considerations

- **Observer efficiency**: With 56 clip slots + track states, observer count is high
  - Current: 56 slots × 5 states = 280 observers
  - Adding track states: + 8 tracks × 3 states = 24 observers
  - Total: ~304 observers
- **Refresh rate**: How often should we update the grid?
- **Color calculations**: RGB to Launchpad conversion happens frequently

### User Preferences

Consider making these configurable:

- Stop button behavior (always visible vs. mode switching)
- Default quantization setting
- Color brightness levels
- Pulse animation speed
- Scene bank size

## Testing Requirements

When implementing enhancements, test:

1. **State accuracy**: Do pad colors accurately reflect clip states?
2. **Timing**: Are clips launched with correct quantization?
3. **Edge cases**: Empty projects, single track, many tracks (>8)
4. **Performance**: Does the grid update smoothly?
5. **Color mapping**: Do all track colors map correctly?
6. **Multi-page**: Do features work after switching pages?

## Documentation Updates

When features are implemented, update:

- `clip-launcher-usage.md` - Add new features to usage guide
- `bitwig-api-findings.md` - Document new API discoveries
- `README.md` - Update feature list and screenshots
- Inline code comments - Document complex logic

## Related Features

Consider how clip launcher enhancements integrate with:

- **Group selection** (page 1): Clip launcher should respect selected group
- **Marker navigation**: Jump to markers and launch scenes
- **MIDI Fighter Twister**: Encoder control for clip/track parameters
- **Transport controls**: Play/stop/record integration
- **Track grid** (page 1): Consistent track selection across pages
