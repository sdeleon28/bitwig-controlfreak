/**
 * Animation system for visual effects
 */
class Animations {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance (clearPad, setPadColor, colors)
     * @param {Object} deps.host - Bitwig host (scheduleTask)
     */
    constructor(deps) {
        this.launchpad = deps.launchpad;
        this.host = deps.host;
    }

    /**
     * Flash page number on pad grid
     * @param {number} pageNum - Page number to display
     * @param {Function} callback - Called when animation completes
     */
    flashPageNumber(pageNum, callback) {
        var launchpad = this.launchpad;
        var host = this.host;

        // Clear all pads
        for (var i = 0; i < 128; i++) {
            launchpad.clearPad(i);
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
                    launchpad.setPadColor(pattern[i], launchpad.colors.white);
                } else {
                    launchpad.clearPad(pattern[i]);
                }
            }

            flashCount++;
            host.scheduleTask(doFlash, null, flashInterval);
        }

        doFlash();
    }
}

if (typeof module !== 'undefined') module.exports = Animations;
