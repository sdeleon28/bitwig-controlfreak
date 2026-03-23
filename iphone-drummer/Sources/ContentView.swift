import SwiftUI

struct ContentView: View {
    @StateObject private var midi = MIDIEngine()

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height) - 12
            ZStack {
                VStack(spacing: 6) {
                    ForEach(0..<4, id: \.self) { row in
                        HStack(spacing: 6) {
                            ForEach(0..<4, id: \.self) { col in
                                let index = (3 - row) * 4 + col
                                PadView(note: MIDIEngine.baseNote + UInt8(index), midi: midi)
                                    .aspectRatio(1, contentMode: .fit)
                            }
                        }
                    }

                    Button("Send to Bitwig") {
                        midi.sendMidiLink(AppToBitwigMessage(growl: "Hello from iPhone"))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                }
                .frame(width: side)
                .position(x: geo.size.width / 2, y: geo.size.height / 2)

                if let growl = midi.latestGrowl {
                    VStack {
                        GrowlView(text: growl)
                            .padding(.top, 60)
                        Spacer()
                    }
                }
            }
        }
        .background(.black)
        .ignoresSafeArea()
    }
}
