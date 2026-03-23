import Foundation

/// Message sent from Bitwig to the iPhone app via MidiLink protocol.
struct BitwigToAppMessage: Decodable {
    var growl: String?
}

/// Message sent from the iPhone app to Bitwig (future use).
struct AppToBitwigMessage: Codable {}

/// Stateful decoder for MidiLink frames arriving as individual MIDI note-on events.
///
/// Frame format (channel 15, status 0x9E):
///   Note 0, velocity = length low 7 bits
///   Note 1, velocity = length high 7 bits
///   Notes 2..N+1, velocity = ASCII byte value
final class MidiLinkDecoder {
    private var events: [(note: UInt8, velocity: UInt8)] = []
    private var expectedLength: Int?

    /// Feed a single MIDI event. Returns a decoded message when a complete frame is received.
    func feed(status: UInt8, note: UInt8, velocity: UInt8) -> BitwigToAppMessage? {
        // Only accept channel 15 note-on (status 0x9E)
        guard status == 0x9E else { return nil }

        events.append((note: note, velocity: velocity))

        // After 2 events, compute expected length
        if events.count == 2 {
            let low = Int(events[0].velocity)
            let high = Int(events[1].velocity)
            expectedLength = low | (high << 7)
        }

        // Check if frame is complete
        guard let expected = expectedLength, events.count >= expected + 2 else {
            return nil
        }

        // Extract payload bytes
        var chars: [UInt8] = []
        for i in 0..<expected {
            chars.append(events[i + 2].velocity)
        }

        // Reset state
        events.removeAll()
        expectedLength = nil

        // Decode JSON
        let data = Data(chars)
        return try? JSONDecoder().decode(BitwigToAppMessage.self, from: data)
    }

    /// Reset decoder state (e.g., on connection change).
    func reset() {
        events.removeAll()
        expectedLength = nil
    }
}
