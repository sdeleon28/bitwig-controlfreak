import SwiftUI

struct PadView: View {
    let note: UInt8
    let midi: MIDIEngine
    @State private var isPressed = false

    private static let names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    private var noteName: String {
        let octave = Int(note) / 12 - 1
        let idx = Int(note) % 12
        return "\(Self.names[idx])\(octave)"
    }

    private var padColor: Color {
        let isSharp = [1, 3, 6, 8, 10].contains(Int(note) % 12)
        return isSharp
            ? Color(red: 0.25, green: 0.25, blue: 0.35)
            : Color(red: 0.15, green: 0.35, blue: 0.55)
    }

    var body: some View {
        Text(noteName)
            .font(.system(size: 20, weight: .bold, design: .monospaced))
            .minimumScaleFactor(0.5)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(isPressed ? Color.orange : padColor)
            .cornerRadius(8)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                            midi.noteOn(note: note)
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                        midi.noteOff(note: note)
                    }
            )
    }
}
