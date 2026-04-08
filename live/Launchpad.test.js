var LaunchpadHW = require('./Launchpad');
var t = require('../test-assert');
var assert = t.assert;

function fakeOutput() {
    var msgs = [];
    return {
        sendMidi: function(s, d1, d2) { msgs.push([s, d1, d2]); },
        sendSysex: function(s) { msgs.push(['sysex', s]); },
        _msgs: msgs
    };
}

// setPadColor sends 0x90 status
(function() {
    var out = fakeOutput();
    var lp = new LaunchpadHW({ midiOutput: out });
    lp.setPadColor(11, 5);
    assert(out._msgs.length === 1 && out._msgs[0][0] === 0x90, '0x90 status');
})();

// click behavior fires on quick press/release
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 1;} };
    var clicked = 0;
    lp.registerPadBehavior(11, function(){ clicked++; }, null, 1);
    lp.handlePadPress(11);
    lp.handlePadRelease(11);
    assert(clicked === 1, 'click fired');
})();

// click behavior on a different page does not fire
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 2;} };
    var clicked = 0;
    lp.registerPadBehavior(11, function(){ clicked++; }, null, 1);
    var ok = lp.handlePadPress(11);
    assert(ok === false, 'press refused on inactive page');
    assert(clicked === 0, 'no click');
})();

// hold behavior fires on long press
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 1;} };
    var clicked = 0, held = 0;
    lp.registerPadBehavior(11, function(){ clicked++; }, function(){ held++; }, 1);
    lp.handlePadPress(11);
    // simulate elapsed time by mutating pressTime
    lp._padTimers[11].pressTime = Date.now() - 1000;
    lp.handlePadRelease(11);
    assert(held === 1 && clicked === 0, 'hold fires, click does not');
})();

// side button click handler
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 2;} };
    var hits = 0;
    lp.registerSideButton(49, function(){ hits++; }, 2);
    var ok = lp.handleSideButtonPress(49);
    assert(ok === true, 'handled');
    assert(hits === 1, 'click fired');
})();

// side button on inactive page is rejected
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 1;} };
    var hits = 0;
    lp.registerSideButton(49, function(){ hits++; }, 2);
    var ok = lp.handleSideButtonPress(49);
    assert(ok === false, 'rejected');
    assert(hits === 0, 'no fire');
})();

// top button always-active (pageNumber null)
(function() {
    var lp = new LaunchpadHW({});
    lp.pager = { getActivePage: function(){return 9;} };
    var hits = 0;
    lp.registerTopButton(104, function(){ hits++; }, null);
    lp.handleTopButtonPress(104);
    assert(hits === 1, 'always-active top button fires');
})();

// isSideButton
(function() {
    var lp = new LaunchpadHW({});
    assert(lp.isSideButton(89) === true, '89 is side');
    assert(lp.isSideButton(11) === false, '11 is not side');
})();

// bitwigColorToLaunchpad: known palette entry
(function() {
    var lp = new LaunchpadHW({});
    var c = lp.bitwigColorToLaunchpad(216/255, 46/255, 34/255); // red
    assert(c === 72, 'maps known red');
})();

process.exit(t.summary('Launchpad (live)'));
