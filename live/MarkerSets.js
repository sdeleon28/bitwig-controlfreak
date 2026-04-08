/**
 * Pure functions for grouping cue markers into per-song "marker sets".
 *
 * Convention:
 *   - A marker named "{ songname" opens a new song.
 *   - A marker named "}" closes the current song.
 *   - Any other marker between { and } is a section of the current song.
 *
 * Markers outside any { } pair are ignored.
 *
 * Input: an array of plain marker objects (as produced by Bitwig.readMarkers):
 *   { index, name, position, color, marker }
 *
 * Output: an array of MarkerSet objects:
 *   { name: "songname",
 *     startBeat: <beat of opening { marker>,
 *     endBeat: <beat of closing } marker>,
 *     markers: [ ... ] }
 */
var MarkerSets = (function() {

    function isOpener(name) {
        return typeof name === 'string' && name.charAt(0) === '{';
    }

    function isCloser(name) {
        return typeof name === 'string' && name.charAt(0) === '}';
    }

    function extractName(openerName) {
        // "{ amy" -> "amy", "{amy" -> "amy", "{" -> ""
        var rest = openerName.slice(1);
        return rest.replace(/^\s+/, '');
    }

    /**
     * Walk a sorted-by-position array of markers and group them into songs.
     */
    function groupMarkers(markers) {
        var sets = [];
        var current = null;

        for (var i = 0; i < markers.length; i++) {
            var m = markers[i];
            if (isOpener(m.name)) {
                // If a previous song was left open (no closing brace), drop it.
                current = {
                    name: extractName(m.name),
                    startBeat: m.position,
                    endBeat: null,
                    markers: [m]
                };
            } else if (isCloser(m.name)) {
                if (current) {
                    current.markers.push(m);
                    current.endBeat = m.position;
                    sets.push(current);
                    current = null;
                }
                // Closer with no opener is ignored.
            } else {
                if (current) {
                    current.markers.push(m);
                }
                // Section marker outside any song is ignored.
            }
        }

        return sets;
    }

    /**
     * Find the index of the song containing the given beat position.
     * Returns -1 if no song contains it.
     *
     * A song "contains" a beat if startBeat <= beat < endBeat. The closing
     * } marker is treated as exclusive so that hitting the end of one song
     * with `position == nextSong.startBeat` lands you in the next song.
     */
    function findSongIndexContainingBeat(sets, beat) {
        for (var i = 0; i < sets.length; i++) {
            var s = sets[i];
            if (s.startBeat === null || s.startBeat === undefined) continue;
            if (s.endBeat === null || s.endBeat === undefined) continue;
            if (beat >= s.startBeat && beat < s.endBeat) {
                return i;
            }
        }
        return -1;
    }

    return {
        groupMarkers: groupMarkers,
        findSongIndexContainingBeat: findSongIndexContainingBeat,
        isOpener: isOpener,
        isCloser: isCloser,
        extractName: extractName
    };
})();

if (typeof module !== 'undefined') module.exports = MarkerSets;
