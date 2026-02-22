/**
 * Launchpad quadrant configuration
 */
class LaunchpadQuadrantHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        // Bottom-right 4x4 quadrant for group selection
        this.bottomRight = this._buildBottomRight();

        // Bottom-left 4x4 quadrant for track grid
        this.bottomLeft = this._buildBottomLeft();

        if (this.debug) this.println("LaunchpadQuadrant initialized");
    }

    _buildBottomRight() {
        var launchpad = this.launchpad;

        var pads = [
            15, 16, 17, 18,  // Row 0 (bottom): groups 1-4
            25, 26, 27, 28,  // Row 1: groups 5-8
            35, 36, 37, 38,  // Row 2: groups 9-12
            45, 46, 47, 48   // Row 3 (top): groups 13-16
        ];

        // Build pad to group mapping
        var padToGroup = {};
        for (var i = 0; i < pads.length; i++) {
            padToGroup[pads[i]] = i + 1;
        }

        return {
            pads: pads,

            getGroup: function(padNote) {
                return padToGroup[padNote] || null;
            },

            highlightGroup: function(groupNumber) {
                if (!launchpad) return;
                // Clear all group selector pads
                for (var i = 0; i < pads.length; i++) {
                    launchpad.clearPad(pads[i]);
                }
                // Highlight selected group
                if (groupNumber >= 1 && groupNumber <= 16) {
                    var padNote = pads[groupNumber - 1];
                    launchpad.setPadColor(padNote, 'green');
                }
            }
        };
    }

    _buildBottomLeft() {
        var pads = [
            11, 12, 13, 14,  // Row 0 (bottom): tracks 1-4
            21, 22, 23, 24,  // Row 1: tracks 5-8
            31, 32, 33, 34,  // Row 2: tracks 9-12
            41, 42, 43, 44   // Row 3 (top): tracks 13-16
        ];

        return {
            pads: pads,

            getTrackNumber: function(padNote) {
                var index = pads.indexOf(padNote);
                return index !== -1 ? index + 1 : null;
            }
        };
    }
}

var LaunchpadQuadrant = {};
if (typeof module !== 'undefined') module.exports = LaunchpadQuadrantHW;
