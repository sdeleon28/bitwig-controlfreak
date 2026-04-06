loadAPI(24);

host.defineController("Generic", "Twister Color Logger", "1.0", "a015c010-c010-c010-c010-c010c010c010", "xan_t");
host.defineMidiPorts(1, 1);

var NUM_ENCODERS = 16;
var TOTAL_COLORS = 128;
var COLORS_PER_PAGE = NUM_ENCODERS;
var TOTAL_PAGES = Math.ceil(TOTAL_COLORS / COLORS_PER_PAGE);
var currentPage = 0;

// Twister encoder layout: CCs 12-15 (top row), 8-11, 4-7, 0-3 (bottom row)
// Encoder 1 (top-left) = CC 12, Encoder 16 (bottom-right) = CC 3
function encoderToCC(encoderNumber) {
    var encoder0 = encoderNumber - 1;
    var row = Math.floor(encoder0 / 4);
    var col = encoder0 % 4;
    var flippedRow = 3 - row;
    return flippedRow * 4 + col;
}

function ccToEncoder(cc) {
    var flippedRow = Math.floor(cc / 4);
    var col = cc % 4;
    var row = 3 - flippedRow;
    return row * 4 + col + 1;
}

function paintPage() {
    var out = host.getMidiOutPort(0);
    var offset = currentPage * COLORS_PER_PAGE;

    for (var enc = 1; enc <= NUM_ENCODERS; enc++) {
        var colorValue = offset + (enc - 1);
        var cc = encoderToCC(enc);

        if (colorValue < TOTAL_COLORS) {
            out.sendMidi(0xB1, cc, colorValue);   // set color
            out.sendMidi(0xB2, cc, 47);            // max brightness
        } else {
            out.sendMidi(0xB2, cc, 17);            // off
        }
    }


}

function init() {
    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        // Side buttons on channel 3 (0xB3) for page navigation
        if (status === 0xB3 && data2 === 127) {
            if (data1 === 13) {
                currentPage = (currentPage + 1) % TOTAL_PAGES;
                paintPage();
            } else if (data1 === 10) {
                currentPage = (currentPage - 1 + TOTAL_PAGES) % TOTAL_PAGES;
                paintPage();
            }
            return;
        }

        // Encoder button presses on channel 1 (0xB1)
        if (status === 0xB1 && data2 === 127) {
            var enc = ccToEncoder(data1);
            var colorValue = currentPage * COLORS_PER_PAGE + (enc - 1);
            if (colorValue < TOTAL_COLORS) {
                println('Twister color: ' + colorValue);
            }
        }
    });

    host.getMidiInPort(0).setSysexCallback(function() {});

    paintPage();
    println('[TwisterColorLogger] Ready - ' + TOTAL_COLORS + ' colors across ' + TOTAL_PAGES + ' pages');
    println('[TwisterColorLogger] Press encoder buttons to log colors, CC10=back CC13=fwd');
}

function flush() {}
function exit() {}
