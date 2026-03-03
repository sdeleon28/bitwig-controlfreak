loadAPI(24);

host.setShouldFailOnDeprecatedUse(true);
host.defineController("Custom", "Device Inspector", "0.1", "b9b19e97-ba0c-463c-8aab-bc0893cc5935", "santi");

var NUM_PARAMS = 8;

function init() {
   var cursorTrack = host.createCursorTrack("DEVINSPECT_CURSOR_TRACK", "Cursor Track", 0, 0, true);
   var cursorDevice = cursorTrack.createCursorDevice("DEVINSPECT_CURSOR_DEVICE", "Cursor Device", 0, CursorDeviceFollowMode.FOLLOW_SELECTION);
   var remoteControls = cursorDevice.createCursorRemoteControlsPage(NUM_PARAMS);

   cursorDevice.exists().markInterested();
   cursorDevice.name().markInterested();
   remoteControls.pageCount().markInterested();

   for (var i = 0; i < NUM_PARAMS; i++) {
      remoteControls.getParameter(i).name().markInterested();
   }

   cursorDevice.name().addValueObserver(function(deviceName) {
      if (!cursorDevice.exists().get()) {
         println("No device selected");
         return;
      }

      println("Device selected: " + deviceName);

      host.scheduleTask(function() {
         var pages = remoteControls.pageCount().get();
         if (pages === 0) {
            println("  no remote controls");
            return;
         }

         println("  Remote control params:");
         for (var i = 0; i < NUM_PARAMS; i++) {
            var paramName = remoteControls.getParameter(i).name().get();
            if (paramName !== "") {
               println("    [" + i + "] " + paramName);
            }
         }
      }, 50);
   });

   println("Device Inspector initialized.");
}

function flush() {}

function exit() {}
