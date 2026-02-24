var TwisterPalette = {
    black: 0,
    blue1: 1, blue2: 2, blue3: 3, blue4: 4, blue5: 5, blue6: 6, blue7: 7, blue8: 8,
    blue9: 9, blue10: 10, blue11: 11, blue12: 12, blue13: 13, blue14: 14, blue15: 15, blue16: 16, blue17: 17,
    cyan1: 18, cyan2: 19, cyan3: 20, cyan4: 21, cyan5: 22, cyan6: 23, cyan7: 24, cyan8: 25,
    cyan9: 26, cyan10: 27, cyan11: 28, cyan12: 29, cyan13: 30, cyan14: 31, cyan15: 32, cyan16: 33, cyan17: 34,
    aqua1: 35, aqua2: 36, aqua3: 37, aqua4: 38, aqua5: 39, aqua6: 40, aqua7: 41, aqua8: 42,
    green1: 43, green2: 44, green3: 45, green4: 46, green5: 47, green6: 48, green7: 49, green8: 50,
    green9: 51, green10: 52, green11: 53, green12: 54, green13: 55, green14: 56, green15: 57, green16: 58, green17: 59,
    yellow1: 60, yellow2: 61, yellow3: 62, yellow4: 63, yellow5: 64, yellow6: 65, yellow7: 66, yellow8: 67,
    yellow9: 68, yellow10: 69, yellow11: 70, yellow12: 71,
    orange1: 72, orange2: 73, orange3: 74, orange4: 75, orange5: 76, orange6: 77, orange7: 78, orange8: 79,
    red1: 80, red2: 81, red3: 82, red4: 83, red5: 84, red6: 85, red7: 86,
    magenta1: 87, magenta2: 88, magenta3: 89, magenta4: 90, magenta5: 91,
    pink1: 92, pink2: 93, pink3: 94, pink4: 95, pink5: 96, pink6: 97, pink7: 98, pink8: 99,
    purple1: 100, purple2: 101, purple3: 102, purple4: 103, purple5: 104, purple6: 105, purple7: 106, purple8: 107,
    purple9: 108, purple10: 109, purple11: 110, purple12: 111
};

function TwisterPainter(deps) {
    this._output = deps.midiOutput;
}

TwisterPainter.prototype.paint = function(encoderNumber, color) {
    var cc = this.encoderToCC(encoderNumber);
    this._output.sendMidi(0xB1, cc, color);
    this._output.sendMidi(0xB2, cc, 47);
};

TwisterPainter.prototype.off = function(encoderNumber) {
    var cc = this.encoderToCC(encoderNumber);
    this._output.sendMidi(0xB2, cc, 17);
};

TwisterPainter.prototype.encoderToCC = function(encoderNumber) {
    var encoder0 = encoderNumber - 1;
    var row = Math.floor(encoder0 / 4);
    var col = encoder0 % 4;
    return (3 - row) * 4 + col;
};

var TwisterPainter_ns = { TwisterPalette: TwisterPalette, TwisterPainter: TwisterPainter };
if (typeof module !== 'undefined') module.exports = TwisterPainter_ns;
