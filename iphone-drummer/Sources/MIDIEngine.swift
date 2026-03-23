import CoreMIDI
import Foundation
import Network

final class MIDIEngine: ObservableObject {
    private var client: MIDIClientRef = 0
    private var source: MIDIEndpointRef = 0
    private var outputPort: MIDIPortRef = 0
    private var browser: NWBrowser?

    /// C2 in standard MIDI (middle C = C4 = 60)
    static let baseNote: UInt8 = 36

    init() {
        let cs = MIDIClientCreate("iPhoneDrummer" as CFString, nil, nil, &client)
        guard cs == noErr else {
            print("[MIDI] client error: \(cs)")
            return
        }
        let ss = MIDISourceCreateWithProtocol(client, "iPhone Drummer" as CFString, ._1_0, &source)
        if ss != noErr {
            print("[MIDI] source error: \(ss) — virtual source unavailable, network send still active")
        }

        let ps = MIDIOutputPortCreate(client, "iPhoneDrummer-Out" as CFString, &outputPort)
        if ps != noErr {
            print("[MIDI] output port error: \(ps)")
        }

        let session = MIDINetworkSession.default()
        session.isEnabled = true
        session.connectionPolicy = .anyone

        // Browse for Apple MIDI services to trigger the local network permission prompt
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_apple-midi._udp", domain: nil)
        let nwBrowser = NWBrowser(for: descriptor, using: .udp)
        nwBrowser.stateUpdateHandler = { state in
            print("[NWBrowser] state: \(state)")
        }
        nwBrowser.browseResultsChangedHandler = { results, changes in
            print("[NWBrowser] results: \(results.count)")
        }
        nwBrowser.start(queue: .main)
        self.browser = nwBrowser
    }

    func noteOn(note: UInt8, velocity: UInt8 = 127) {
        send(status: 0x90, data1: note, data2: velocity)
    }

    func noteOff(note: UInt8) {
        send(status: 0x80, data1: note, data2: 0)
    }

    private func send(status: UInt8, data1: UInt8, data2: UInt8) {
        // UMP event list for local virtual source
        var eventList = MIDIEventList()
        var packet = MIDIEventListInit(&eventList, ._1_0)
        // UMP MIDI 1.0 Channel Voice: message type 0x2, group 0
        let word: UInt32 = 0x20 << 24 | UInt32(status) << 16 | UInt32(data1) << 8 | UInt32(data2)
        var ump = word
        packet = withUnsafePointer(to: &ump) { ptr in
            MIDIEventListAdd(&eventList, MemoryLayout<MIDIEventList>.size, packet, 0, 1, ptr)
        }
        let err = MIDIReceivedEventList(source, &eventList)
        if err != noErr {
            print("[MIDI] MIDIReceivedEventList error: \(err)")
        }

        // Legacy MIDIPacketList for network session (RTP-MIDI uses MIDI 1.0)
        let session = MIDINetworkSession.default()
        let networkDest = session.destinationEndpoint()
        print("[MIDI] network enabled=\(session.isEnabled) connections=\(session.connections().count) destRef=\(networkDest)")

        var packetList = MIDIPacketList()
        var pkt = MIDIPacketListInit(&packetList)
        var bytes: [UInt8] = [status, data1, data2]
        pkt = MIDIPacketListAdd(&packetList, MemoryLayout<MIDIPacketList>.size, pkt, 0, 3, &bytes)
        let nerr = MIDISend(outputPort, networkDest, &packetList)
        if nerr != noErr {
            print("[MIDI] MIDISend (network) error: \(nerr)")
        }
    }

    deinit {
        MIDIEndpointDispose(source)
        MIDIClientDispose(client)
    }
}
