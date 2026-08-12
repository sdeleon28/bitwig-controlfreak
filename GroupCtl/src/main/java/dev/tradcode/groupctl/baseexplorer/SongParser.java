package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.Marker;
import java.util.ArrayList;
import java.util.List;

/**
 * Groups cue markers into songs by the {@code { }} naming convention:
 * a marker whose name starts with {@code {} opens a song (the rest of the name,
 * trimmed, is its title), a marker whose name starts with {@code }} closes it,
 * and any marker in between is a section. Markers outside a {@code { }} pair,
 * an opener left unclosed, and a closer with no opener are all dropped.
 */
public class SongParser {

    public List<Song> groupSongs(List<Marker> markers) {
        List<Song> songs = new ArrayList<>();
        if (markers == null)
            return songs;

        List<Marker> sorted = new ArrayList<>(markers);
        sorted.sort((a, b) -> Double.compare(a.position(), b.position()));

        String name = null;
        double startBeat = 0;
        List<Marker> current = null;
        for (Marker m : sorted) {
            if (isOpener(m.name())) {
                name = extractName(m.name());
                startBeat = m.position();
                current = new ArrayList<>();
                current.add(m);
            } else if (isCloser(m.name())) {
                if (current != null) {
                    current.add(m);
                    songs.add(new Song(name, startBeat, m.position(), List.copyOf(current)));
                    current = null;
                }
            } else if (current != null) {
                current.add(m);
            }
        }
        return songs;
    }

    /** Index of the song containing {@code beat} (startBeat inclusive, endBeat exclusive), or -1. */
    public int findSongIndexContainingBeat(List<Song> songs, double beat) {
        for (int i = 0; i < songs.size(); i++) {
            Song s = songs.get(i);
            if (beat >= s.startBeat() && beat < s.endBeat())
                return i;
        }
        return -1;
    }

    public static boolean isOpener(String name) {
        return name != null && !name.isEmpty() && name.charAt(0) == '{';
    }

    public static boolean isCloser(String name) {
        return name != null && !name.isEmpty() && name.charAt(0) == '}';
    }

    public static String extractName(String openerName) {
        return openerName.substring(1).replaceFirst("^\\s+", "");
    }
}
