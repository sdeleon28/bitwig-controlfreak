# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bitwig Studio Controller Script for integrating hardware controllers (Launchpad MK2, MIDI Fighter Twister, Roland Piano, nanoKEY2) with Bitwig Studio. The script uses Bitwig's Control Surface API (loadAPI 24) and is written in vanilla JavaScript without any build tools.

There's also a separate TD-17 drum remapper script (`TD17.control.js`) for mapping Roland TD-17 drum pad output to work with GGD drum plugins.

## Development

**Testing changes**: Controller scripts are loaded by Bitwig at startup. To test changes:
1. Save the `.control.js` file
2. In Bitwig: Settings → Controllers → Refresh or restart Bitwig

**Debugging**: Set `var debug = true;` at the top of `Launchpad.control.js` to enable verbose logging to Bitwig's console (Help → Open Script Console).

**No build step required** - files are loaded directly by Bitwig's JavaScript runtime.

## Testing

**All new features and changes must include tests.** Run the full suite with:

```
just test
```

### Test Conventions

- **Co-located test files**: Each module `Foo.js` has a corresponding `Foo.test.js` in the same directory.
- **Custom assert helper**: Tests use `test-assert.js` (not a framework). Import with `var t = require('./test-assert'); var assert = t.assert;`.
- **IIFE pattern**: Each test case is a self-contained IIFE with a comment describing the behavior under test:
  ```js
  // description of what is being tested
  (function() {
      var thing = makeSubject();
      assert(thing.result === expected, 'assertion message');
  })();
  ```
- **Dependency injection**: Modules accept dependencies via constructor options. Tests pass in fakes/stubs (e.g., `fakeMidiOutput()`, `fakePager()`, `fakeBitwig()`) to isolate the unit under test.
- **Summary footer**: Every test file ends with `process.exit(t.summary('ModuleName'));`.
- **Register new test files**: When creating a new test file, add a `node YourModule.test.js` line to the `justfile`.

## Architecture

### Layer System (Load Order)

Files are loaded in this specific order via `load()` in `Launchpad.control.js`:

1. **Foundation** - `Bitwig.js`, `BitwigActions.js`, `Pages.js` - Core API wrappers and page system
2. **Hardware Abstraction** - `Launchpad.js`, `Twister.js`, `RolandPiano.js`, `NanoKey2.js` - Device communication
3. **Isolation** - `Pager.js`, `Animations.js` - Reactive state management
4. **UI Components** - `LaunchpadQuadrant.js`, `LaunchpadModeSwitcher.js`, `LaunchpadLane.js`, `ProjectExplorer.js`, `LaunchpadTopButtons.js`, `ClipLauncher.js`, `ClipGestures.js`
5. **Page Implementations** - `Page_MainControl.js`, `Page_ClipLauncher.js`, `Page_MarkerManager.js`, `Page_DebugActions.js`
6. **Orchestrator** - `Controller.js` - Main business logic

### Key Architectural Patterns

**Namespace Pattern**: Each file defines a global namespace object (e.g., `var Bitwig = {...}`, `var Launchpad = {...}`). These are global singletons accessible throughout the codebase.

**Reactive Pager System**: `Pager.js` implements "UI is a function of state":
- Each page maintains its own state (desired pad colors)
- All paint requests go through `Pager.requestPaint(pageNumber, padNumber, color)`
- Pager only updates hardware if request is from active page
- On page switch, Pager atomically clears and repaints stored state

**Track Naming Convention**: Tracks and groups use `(N)` naming pattern (e.g., "Bass (1)") to link to Twister encoder N. FX tracks use `[N]` pattern.

**Pad Behaviors**: `Launchpad.registerPadBehavior(padNote, clickCallback, holdCallback, pageNumber)` registers click/hold handlers that are page-aware.

### Important Files

- `Launchpad.control.js` - Entry point, defines MIDI ports, sets up observers, calls `init()`
- `Controller.js` - Main business logic, handles group selection, encoder linking, MIDI routing
- `Bitwig.js` - Wraps Bitwig API (track bank, transport, markers, cursor track)
- `Pager.js` - Page state isolation, hardware gatekeeper

### Bitwig API Notes

- Track bank has 64 slots (indexes 0-63)
- Effect track bank has 8 slots (indexes 0-7)
- Markers accessed via `arranger.createCueMarkerBank(32)`
- All Bitwig properties need `.markInterested()` before reading and observers added in `init()`
- Use `host.scheduleTask(callback, null, delayMs)` for delayed execution
- Always prefer existing exaple code in the codebase when looking up how to do something. If we don't have an example in the codebase, you can read these (in this order and only until you find your answer):
    - Example code at ../bitwig-tutorials
    - Pre-loaded API scripts: /Applications/Bitwig Studio.app/Contents/Resources/ControllerScripts/api
    - API Reference: /Applications/Bitwig%20Studio.app/Contents/Resources/Documentation/control-surface/api/index.html
