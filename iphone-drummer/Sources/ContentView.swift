import SwiftUI

struct ContentView: View {
    @StateObject private var midi = MIDIEngine()

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height) - 12
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
            }
            .frame(width: side, height: side)
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
        .background(.black)
        .ignoresSafeArea()
    }
}
