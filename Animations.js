/**
 * Animation system for visual effects
 * @namespace
 */
var Animations = {
    /**
     * Flash page number on pad grid
     * @param {number} pageNum - Page number to display
     * @param {Function} callback - Called when animation completes
     */
    flashPageNumber: function(pageNum, callback) {
        // Clear all pads
        for (var i = 0; i < 128; i++) {
            Launchpad.clearPad(i);
        }

        // Define number patterns (using pad grid)
        var numberPatterns = {
            1: [24, 34, 44, 54, 64, 74],  // Centered vertical line (aligned with 2 and 3)
            2: [
                // Improved "2" pattern
                72, 73, 74, 75,     // Top horizontal
                65, 75,             // Top right
                54, 55,             // Middle
                43,                 // Middle left
                32,                 // Bottom left
                22, 23, 24, 25      // Bottom horizontal
            ],
            3: [
                // "3" pattern
                72, 73, 74, 75,     // Top horizontal
                65,                 // Top right side
                53, 54, 55,         // Middle horizontal
                45,                 // Middle right side
                35,                 // Bottom right side
                22, 23, 24, 25      // Bottom horizontal
            ]
        };

        var pattern = numberPatterns[pageNum];
        if (!pattern) {
            if (callback) callback();
            return;
        }

        // Flash 2 times (faster)
        var flashCount = 0;
        var flashInterval = 80;  // Faster flashing

        function doFlash() {
            if (flashCount >= 4) {  // 2 on/off cycles
                // Animation complete
                if (callback) callback();
                return;
            }

            var isOn = flashCount % 2 === 0;
            for (var i = 0; i < pattern.length; i++) {
                if (isOn) {
                    Launchpad.setPadColor(pattern[i], Launchpad.colors.white);
                } else {
                    Launchpad.clearPad(pattern[i]);
                }
            }

            flashCount++;
            host.scheduleTask(doFlash, null, flashInterval);
        }

        doFlash();
    }
};

/**
 * @typedef {Object} LaunchpadColor
 * @property {number} value - MIDI color value for Launchpad
 */

