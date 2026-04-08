var BitwigHW = require('./Bitwig');
var t = require('../test-assert');
var assert = t.assert;

function fakeProp(initial) {
    var v = initial;
    var observers = [];
    return {
        get: function() { return v; },
        set: function(newV) { v = newV; observers.forEach(function(o){ o(v); }); },
        markInterested: function() {},
        addValueObserver: function(o) { observers.push(o); },
        toggle: function() { v = !v; observers.forEach(function(o){ o(v); }); }
    };
}

function fakeColorProp(r, g, b) {
    var observers = [];
    return {
        red: function() { return r; },
        green: function() { return g; },
        blue: function() { return b; },
        markInterested: function() {},
        addValueObserver: function(o) { observers.push(o); },
        _set: function(R, G, B) { r=R; g=G; b=B; observers.forEach(function(o){ o(r, g, b); }); }
    };
}

function fakeTrack(name, exists) {
    var nameP = fakeProp(name);
    var existsP = fakeProp(exists);
    var muteP = fakeProp(false), soloP = fakeProp(false), armP = fakeProp(false);
    var colorP = fakeColorProp(0, 0, 0);
    var volP = fakeProp(0.5), panP = fakeProp(0);
    return {
        name: function() { return nameP; },
        exists: function() { return existsP; },
        mute: function() { return muteP; },
        solo: function() { return soloP; },
        arm: function() { return armP; },
        color: function() { return colorP; },
        volume: function() { return volP; },
        pan: function() { return panP; }
    };
}

function fakeMarker(name, position, exists) {
    var nameP = fakeProp(name);
    var posP = fakeProp(position);
    var existsP = fakeProp(exists);
    var colorP = fakeColorProp(0, 0, 0);
    return {
        name: function() { return nameP; },
        position: function() { return posP; },
        exists: function() { return existsP; },
        getColor: function() { return colorP; }
    };
}

function fakeBank(items) {
    return { getItemAt: function(i) { return items[i]; } };
}

function fakeHost(trackBank, masterTrack, markerBank, transport) {
    return {
        createTransport: function() { return transport; },
        createMainTrackBank: function(){ return trackBank; },
        createMasterTrack: function() { return masterTrack; },
        createApplication: function() { return { getAction: function(){return null;} }; },
        createArranger: function() { return { createCueMarkerBank: function(){ return markerBank; } }; }
    };
}

function fakeTransport() {
    return {
        playPosition: function(){ return fakeProp(0); },
        tempo: function(){ return fakeProp(120); },
        playStartPosition: function(){ return fakeProp(0); },
        arrangerLoopStart: function(){ return fakeProp(0); },
        arrangerLoopDuration: function(){ return fakeProp(0); },
        isArrangerLoopEnabled: function(){ return fakeProp(false); },
        isMetronomeEnabled: function(){ return fakeProp(false); },
        setPosition: function(b){ this.lastPos = b; }
    };
}

// slot map: tracks named "(N)" populate the right slots
(function() {
    var tracks = [];
    for (var i = 0; i < 16; i++) tracks.push(fakeTrack('', false));
    tracks[0] = fakeTrack('vox (3)', true);
    tracks[1] = fakeTrack('drums (1)', true);
    tracks[2] = fakeTrack('plain', true);
    tracks[3] = fakeTrack('bass (15)', true);
    var trackBank = fakeBank(tracks);
    var markers = []; for (var j = 0; j < 256; j++) markers.push(fakeMarker('', 0, false));
    var markerBank = fakeBank(markers);
    var transport = fakeTransport();
    var masterTrack = fakeTrack('master', true);
    var host = fakeHost(trackBank, masterTrack, markerBank, transport);

    var bw = new BitwigHW({ host: host });
    bw.init();
    bw._rebuildSlotMap();

    assert(bw.getTrackIdForSlot(3) === 0, 'slot 3 -> track 0');
    assert(bw.getTrackIdForSlot(1) === 1, 'slot 1 -> track 1');
    assert(bw.getTrackIdForSlot(15) === 3, 'slot 15 -> track 3');
    assert(bw.getTrackIdForSlot(2) === null, 'slot 2 unused');
})();

// onTracksUpdated fires when an observed property changes
(function() {
    var tracks = [];
    for (var i = 0; i < 16; i++) tracks.push(fakeTrack('', false));
    tracks[0] = fakeTrack('foo (1)', true);
    var trackBank = fakeBank(tracks);
    var markers = []; for (var j = 0; j < 256; j++) markers.push(fakeMarker('', 0, false));
    var markerBank = fakeBank(markers);
    var transport = fakeTransport();
    var masterTrack = fakeTrack('master', true);
    var host = fakeHost(trackBank, masterTrack, markerBank, transport);
    var bw = new BitwigHW({ host: host });
    bw.init();

    var updates = 0;
    bw.onTracksUpdated(function(){ updates++; });

    tracks[0].mute().toggle();
    assert(updates >= 1, 'mute change triggered update');

    tracks[0].arm().toggle();
    var n = updates;
    tracks[0].name().set('foo renamed (1)');
    assert(updates > n, 'name change triggered update');
})();

// onMarkersUpdated fires when a marker property changes
(function() {
    var tracks = []; for (var i = 0; i < 16; i++) tracks.push(fakeTrack('', false));
    var trackBank = fakeBank(tracks);
    var markers = []; for (var j = 0; j < 256; j++) markers.push(fakeMarker('', 0, false));
    markers[0] = fakeMarker('{ x', 0, true);
    var markerBank = fakeBank(markers);
    var transport = fakeTransport();
    var masterTrack = fakeTrack('master', true);
    var host = fakeHost(trackBank, masterTrack, markerBank, transport);
    var bw = new BitwigHW({ host: host });
    bw.init();

    var hits = 0;
    bw.onMarkersUpdated(function(){ hits++; });
    markers[0].position().set(8);
    assert(hits >= 1, 'marker position change triggered');
})();

// readMarkers returns sorted, existing markers only
(function() {
    var tracks = []; for (var i = 0; i < 16; i++) tracks.push(fakeTrack('', false));
    var trackBank = fakeBank(tracks);
    var markers = []; for (var j = 0; j < 256; j++) markers.push(fakeMarker('', 0, false));
    markers[0] = fakeMarker('{ b', 16, true);
    markers[1] = fakeMarker('{ a', 0, true);
    markers[2] = fakeMarker('}', 32, true);
    markers[3] = fakeMarker('}', 8, true);
    var markerBank = fakeBank(markers);
    var transport = fakeTransport();
    var masterTrack = fakeTrack('master', true);
    var host = fakeHost(trackBank, masterTrack, markerBank, transport);
    var bw = new BitwigHW({ host: host });
    bw.init();
    var read = bw.readMarkers();
    assert(read.length === 4, 'four markers');
    assert(read[0].position === 0, 'sorted by position');
    assert(read[3].position === 32, 'last is highest position');
})();

process.exit(t.summary('Bitwig (live)'));
