loadAPI(24);

host.defineController("Generic", "Color Logger", "1.0", "c010c010-c010-c010-c010-c010c010c010", "xan_t");
host.defineMidiPorts(0, 0);

var NUM_TRACKS = 64;

function init() {
    var trackBank = host.createMainTrackBank(NUM_TRACKS, 0, 0);

    for (var i = 0; i < NUM_TRACKS; i++) {
        var track = trackBank.getItemAt(i);
        track.exists().markInterested();
        track.name().markInterested();
        track.color().markInterested();

        (function(trackIndex, trackObj) {
            trackObj.color().addValueObserver(function(red, green, blue) {
                if (!trackObj.exists().get()) return;

                var name = trackObj.name().get();
                var r255 = Math.round(red * 255);
                var g255 = Math.round(green * 255);
                var b255 = Math.round(blue * 255);
                var hex = '#' + toHex(r255) + toHex(g255) + toHex(b255);

                println('[ColorLogger] Track ' + trackIndex + ' "' + name + '"'
                    + '  float(' + red.toFixed(4) + ', ' + green.toFixed(4) + ', ' + blue.toFixed(4) + ')'
                    + '  rgb(' + r255 + ', ' + g255 + ', ' + b255 + ')'
                    + '  hex(' + hex + ')');
            });
        })(i, track);
    }

    println('[ColorLogger] Ready - monitoring ' + NUM_TRACKS + ' tracks for color changes');
}

function toHex(value) {
    var h = value.toString(16).toUpperCase();
    return h.length === 1 ? '0' + h : h;
}

function flush() {}
function exit() {}
