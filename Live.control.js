loadAPI(24);

host.defineController("Generic", "Live", "1.0", "0a8b6f6c-7c3a-4ad7-9bcc-1bdfae3aa1cf", "xan_t");
host.defineMidiPorts(2, 2);  // 2 inputs (Launchpad, Twister), 2 outputs

var debug = false;

// Foundation
load('live/BitwigActions.js');
load('live/Bitwig.js');
load('live/Pager.js');
load('live/Launchpad.js');
load('live/Twister.js');

// Pure helpers
load('live/MarkerSets.js');

// UI components
load('live/Page_Control.js');
load('live/Page_ProjectExplorer.js');
load('live/MainPager.js');
load('live/SongPager.js');
load('live/BarPager.js');
load('live/ModeSwitcher.js');
load('live/SideButtons.js');

// Orchestrator
load('live/Controller.js');

// Globals — assigned in init()
var Live = {};

function init() {
    var println = function(s) { host.println(s); };

    // ----- Bitwig wrapper -----
    Live.bitwig = new BitwigHW({
        host: host,
        bitwigActions: BitwigActions,
        debug: debug,
        println: println
    });
    Live.bitwig.init({ trackBankSize: 16, markerBankSize: 256 });

    // ----- Launchpad -----
    var launchpadOut = host.getMidiOutPort(0);
    launchpadOut.setShouldSendMidiBeatClock(true);
    Live.launchpad = new LaunchpadHW({
        midiOutput: launchpadOut,
        host: host,
        debug: debug,
        println: println
    });
    Live.launchpad.enterProgrammerMode();

    // Note input so the launchpad doesn't double-trigger Bitwig keyboard
    var noteIn = host.getMidiInPort(0).createNoteInput("Live Launchpad", "");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        Live.controller.onLaunchpadMidi(status, data1, data2);
    });

    // ----- Twister -----
    var twisterOut = host.getMidiOutPort(1);
    Live.twister = new TwisterHW({
        midiOutput: twisterOut,
        bitwig: Live.bitwig,
        host: host,
        debug: debug,
        println: println
    });

    host.getMidiInPort(1).setMidiCallback(function(status, data1, data2) {
        Live.controller.onTwisterMidi(status, data1, data2);
    });

    // ----- Pager -----
    Live.pager = new PagerHW({
        launchpad: Live.launchpad,
        debug: debug,
        println: println
    });
    Live.launchpad.pager = Live.pager;

    // ----- Pages -----
    var CONTROL_PAGE = 1;
    var EXPLORER_PAGE = 2;

    Live.pageControl = new PageControlHW({
        bitwig: Live.bitwig,
        launchpad: Live.launchpad,
        pager: Live.pager,
        pageNumber: CONTROL_PAGE
    });

    Live.pageProjectExplorer = new PageProjectExplorerHW({
        bitwig: Live.bitwig,
        launchpad: Live.launchpad,
        pager: Live.pager,
        host: host,
        markerSets: MarkerSets,
        pageNumber: EXPLORER_PAGE,
        beatsPerBar: 4
    });

    // ----- Pagers -----
    Live.mainPager = new MainPagerHW({
        launchpad: Live.launchpad,
        pager: Live.pager,
        pages: [Live.pageControl, Live.pageProjectExplorer]
    });

    Live.songPager = new SongPagerHW({
        launchpad: Live.launchpad,
        pager: Live.pager,
        projectExplorer: Live.pageProjectExplorer,
        pageNumber: EXPLORER_PAGE
    });

    Live.barPager = new BarPagerHW({
        launchpad: Live.launchpad,
        pager: Live.pager,
        projectExplorer: Live.pageProjectExplorer,
        pageNumber: EXPLORER_PAGE
    });

    // ----- Mode switcher (volume/pan) and side buttons -----
    Live.modeSwitcher = new ModeSwitcherHW({
        launchpad: Live.launchpad,
        twister: Live.twister,
        host: host
    });

    Live.sideButtons = new SideButtonsHW({
        launchpad: Live.launchpad,
        bitwig: Live.bitwig,
        bitwigActions: BitwigActions,
        projectExplorer: Live.pageProjectExplorer,
        host: host,
        pageNumber: EXPLORER_PAGE
    });

    // ----- Orchestrator -----
    Live.controller = new ControllerHW({
        bitwig: Live.bitwig,
        launchpad: Live.launchpad,
        twister: Live.twister,
        pager: Live.pager,
        mainPager: Live.mainPager,
        songPager: Live.songPager,
        barPager: Live.barPager,
        modeSwitcher: Live.modeSwitcher,
        sideButtons: Live.sideButtons,
        pageControl: Live.pageControl,
        pageProjectExplorer: Live.pageProjectExplorer,
        host: host
    });
    Live.controller.init();
}

function flush() {
}

function exit() {
    if (Live && Live.launchpad) {
        Live.launchpad.clearAll();
        if (Live.twister) Live.twister.clearAll();
    }
}
