/**
 * Launchpad quadrant configuration
 * @namespace
 */
var LaunchpadQuadrant = {
    /**
     * Bottom-right 4x4 quadrant for group selection
     */
    bottomRight: {
        /**
         * Pad note numbers (bottom-left to top-right, groups 1-16)
         */
        pads: [
            15, 16, 17, 18,  // Row 0 (bottom): groups 1-4
            25, 26, 27, 28,  // Row 1: groups 5-8
            35, 36, 37, 38,  // Row 2: groups 9-12
            45, 46, 47, 48   // Row 3 (top): groups 13-16
        ],

        /**
         * Map pad note number → group number (1-16)
         * @private
         */
        _padToGroup: null,

        /**
         * Initialize the quadrant
         */
        init: function() {
            // Build pad to group mapping
            this._padToGroup = {};
            for (var i = 0; i < this.pads.length; i++) {
                this._padToGroup[this.pads[i]] = i + 1;
            }
        },

        /**
         * Get group number for a pad
         * @param {number} padNote - MIDI note number
         * @returns {number|null} Group number (1-16) or null
         */
        getGroup: function(padNote) {
            return this._padToGroup[padNote] || null;
        },

        /**
         * Highlight a group on the Launchpad
         * @param {number} groupNumber - Group number (1-16)
         */
        highlightGroup: function(groupNumber) {
            // Clear all group selector pads
            for (var i = 0; i < this.pads.length; i++) {
                Launchpad.clearPad(this.pads[i]);
            }

            // Highlight selected group
            if (groupNumber >= 1 && groupNumber <= 16) {
                var padNote = this.pads[groupNumber - 1];
                Launchpad.setPadColor(padNote, 'green');
            }
        }
    },

    /**
     * Bottom-left 4x4 quadrant for track grid
     */
    bottomLeft: {
        /**
         * Pad note numbers (bottom-left to top-right, tracks 1-16)
         */
        pads: [
            11, 12, 13, 14,  // Row 0 (bottom): tracks 1-4
            21, 22, 23, 24,  // Row 1: tracks 5-8
            31, 32, 33, 34,  // Row 2: tracks 9-12
            41, 42, 43, 44   // Row 3 (top): tracks 13-16
        ],

        /**
         * Initialize the quadrant
         */
        init: function() {
            // No special initialization needed
        },

        /**
         * Get track number for a pad
         * @param {number} padNote - MIDI note number
         * @returns {number|null} Track number (1-16) or null
         */
        getTrackNumber: function(padNote) {
            var index = this.pads.indexOf(padNote);
            return index !== -1 ? index + 1 : null;
        }
    }
};
