/**
 * MidiLink: JSON-over-MIDI protocol for Bitwig <-> iPhone communication.
 *
 * Channel 15 (status 0x9E): Bitwig -> App
 * Channel 16 (status 0x9F): App -> Bitwig (future)
 *
 * Frame format: 2-byte length header + payload note-ons
 *   Note 0, velocity = length low 7 bits
 *   Note 1, velocity = length high 7 bits
 *   Notes 2..N+1, velocity = ASCII byte value
 *
 * @typedef {Object} BitwigToAppMessage
 * @property {string} [growl] - Growl notification text
 *
 * @typedef {Object} AppToBitwigMessage
 */

class MidiLinkHW {
    static STATUS_TO_APP = 0x9E;   // Channel 15
    static STATUS_TO_BITWIG = 0x9F; // Channel 16

    /**
     * @param {Object} deps
     * @param {Object} deps.midiOutput - MIDI output port with sendMidi(status, data1, data2)
     * @param {Object} [deps.host] - Bitwig host for popup notifications
     * @param {boolean} [deps.debug]
     * @param {Function} [deps.println]
     */
    constructor(deps) {
        deps = deps || {};
        this.midiOutput = deps.midiOutput || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};
    }

    /**
     * Encode a JS object into an array of {status, data1, data2} MIDI events.
     * @param {BitwigToAppMessage} message
     * @returns {Array<{status: number, data1: number, data2: number}>}
     */
    static encode(message) {
        if (!message) return [];
        var json = JSON.stringify(message);
        var length = json.length;
        if (length > 16383) return []; // 14-bit max

        var events = [];
        // Length header: low 7 bits in note 0, high 7 bits in note 1
        events.push({ status: MidiLinkHW.STATUS_TO_APP, data1: 0, data2: length & 0x7F });
        events.push({ status: MidiLinkHW.STATUS_TO_APP, data1: 1, data2: (length >> 7) & 0x7F });

        // Payload: each char as velocity on notes 2..N+1
        for (var i = 0; i < length; i++) {
            events.push({ status: MidiLinkHW.STATUS_TO_APP, data1: i + 2, data2: json.charCodeAt(i) });
        }
        return events;
    }

    /**
     * Decode an array of {status, data1, data2} MIDI events back to a JS object.
     * @param {Array<{status: number, data1: number, data2: number}>} events
     * @returns {Object|null}
     */
    static decode(events) {
        if (!events || events.length < 2) return null;

        var lengthLow = events[0].data2;
        var lengthHigh = events[1].data2;
        var length = lengthLow | (lengthHigh << 7);

        if (events.length < length + 2) return null;

        var chars = [];
        for (var i = 0; i < length; i++) {
            chars.push(String.fromCharCode(events[i + 2].data2));
        }

        try {
            return JSON.parse(chars.join(''));
        } catch (e) {
            return null;
        }
    }

    /**
     * Send a message to the iPhone app via MIDI.
     * @param {BitwigToAppMessage} message
     */
    send(message) {
        if (!this.midiOutput) return;
        var events = MidiLinkHW.encode(message);
        for (var i = 0; i < events.length; i++) {
            this.midiOutput.sendMidi(events[i].status, events[i].data1, events[i].data2);
        }
        if (this.host) {
            this.host.showPopupNotification("MidiLink: growl sent");
        }
        if (this.debug) this.println("MidiLink: sent " + events.length + " events");
    }
}

var MidiLink = {};
if (typeof module !== 'undefined') module.exports = MidiLinkHW;
