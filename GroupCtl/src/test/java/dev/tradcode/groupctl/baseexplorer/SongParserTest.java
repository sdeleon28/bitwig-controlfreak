package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.Marker;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class SongParserTest {

    static final String C = "0,0,0";
    static Marker m(double pos, String name) { return new Marker(pos, C, name); }

    private final SongParser parser = new SongParser();

    @Test
    void groupsAnOpenerSectionsAndCloserIntoOneSong() {
        List<Song> songs = parser.groupSongs(List.of(
            m(0, "{ amy"), m(4, "verse"), m(8, "chorus"), m(16, "}")));

        assertEquals(1, songs.size());
        Song s = songs.get(0);
        assertEquals("amy", s.name());
        assertEquals(0.0, s.startBeat());
        assertEquals(16.0, s.endBeat());
        assertEquals(4, s.markers().size()); // opener + 2 sections + closer
    }

    @Test
    void extractsTheNameFromEitherOpenerSpacing() {
        assertEquals("amy", SongParser.extractName("{ amy"));
        assertEquals("amy", SongParser.extractName("{amy"));
        assertEquals("", SongParser.extractName("{"));
    }

    @Test
    void dropsMarkersOutsideAnySong() {
        List<Song> songs = parser.groupSongs(List.of(
            m(0, "intro"),          // before any opener -> ignored
            m(4, "{ song"), m(8, "}"),
            m(12, "outro")));       // after the closer -> ignored

        assertEquals(1, songs.size());
        assertEquals(2, songs.get(0).markers().size());
    }

    @Test
    void dropsAnUnclosedOpener() {
        List<Song> songs = parser.groupSongs(List.of(
            m(0, "{ done"), m(4, "}"),
            m(8, "{ never-closed"), m(12, "section")));

        assertEquals(1, songs.size());
        assertEquals("done", songs.get(0).name());
    }

    @Test
    void ignoresAnOrphanCloser() {
        List<Song> songs = parser.groupSongs(List.of(m(0, "}"), m(4, "loose")));
        assertTrue(songs.isEmpty());
    }

    @Test
    void aSecondOpenerDiscardsThePreviousUnclosedSong() {
        List<Song> songs = parser.groupSongs(List.of(
            m(0, "{ first"), m(4, "part"),
            m(8, "{ second"), m(12, "}")));

        assertEquals(1, songs.size());
        assertEquals("second", songs.get(0).name());
    }

    @Test
    void locatesTheSongContainingABeatWithExclusiveEnd() {
        List<Song> songs = parser.groupSongs(List.of(
            m(0, "{ a"), m(16, "}"),
            m(16, "{ b"), m(32, "}")));

        assertEquals(0, parser.findSongIndexContainingBeat(songs, 0));
        assertEquals(0, parser.findSongIndexContainingBeat(songs, 15.9));
        assertEquals(1, parser.findSongIndexContainingBeat(songs, 16)); // end is exclusive
        assertEquals(-1, parser.findSongIndexContainingBeat(songs, 40));
    }

    @Test
    void handlesEmptyAndNullInput() {
        assertTrue(parser.groupSongs(List.of()).isEmpty());
        assertTrue(parser.groupSongs(null).isEmpty());
    }
}
