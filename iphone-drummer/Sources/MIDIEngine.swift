import CoreMIDI
import Foundation
import Network

final class MIDIEngine: ObservableObject {
    private var client: MIDIClientRef = 0
    private var source: MIDIEndpointRef = 0
    private var inputPort: MIDIPortRef = 0
    private var outputPort: MIDIPortRef = 0
    private var browser: NWBrowser?
    private let decoder = MidiLinkDecoder()
    private var notificationObservers: [NSObjectProtocol] = []

    @Published var latestGrowl: String?
    private var growlClearWork: DispatchWorkItem?

    /// C2 in standard MIDI (middle C = C4 = 60)
    static let baseNote: UInt8 = 36

    init() {
        // Enable network session FIRST, before creating any ports
        let session = MIDINetworkSession.default()
        session.isEnabled = true
        session.connectionPolicy = .anyone

        // Create client with setup-change notifications
        let cs = MIDIClientCreateWithBlock("iPhoneDrummer" as CFString, &client) { [weak self] notification in
            let messageID = notification.pointee.messageID
            if messageID == .msgSetupChanged {
                self?.connectAllSources()
            }
        }
        guard cs == noErr else {
            print("[MIDI] client error: \(cs)")
            return
        }

        let ss = MIDISourceCreateWithProtocol(client, "iPhone Drummer" as CFString, ._1_0, &source)
        if ss != noErr {
            print("[MIDI] source error: \(ss) — virtual source unavailable, network send still active")
        }

        // Create input port using legacy packet-list API (works with MIDI 1.0 network sources)
        let ds = MIDIInputPortCreateWithBlock(
            client,
            "iPhoneDrummer-In" as CFString,
            &inputPort
        ) { [weak self] packetList, srcConnRefCon in
            self?.handleIncomingMIDI(packetList)
        }
        if ds != noErr {
            print("[MIDI] input port error: \(ds)")
        }

        connectAllSources()

        let ps = MIDIOutputPortCreate(client, "iPhoneDrummer-Out" as CFString, &outputPort)
        if ps != noErr {
            print("[MIDI] output port error: \(ps)")
        }

        // Observe network session notifications to reconnect sources
        let nc = NotificationCenter.default
        let sessionObs = nc.addObserver(
            forName: Notification.Name(MIDINetworkNotificationSessionDidChange),
            object: nil, queue: nil
        ) { [weak self] _ in
            self?.connectAllSources()
        }
        let contactsObs = nc.addObserver(
            forName: Notification.Name(MIDINetworkNotificationContactsDidChange),
            object: nil, queue: nil
        ) { [weak self] _ in
            self?.connectAllSources()
        }
        notificationObservers = [sessionObs, contactsObs]

        // Browse for Apple MIDI services to trigger the local network permission prompt
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_apple-midi._udp", domain: nil)
        let nwBrowser = NWBrowser(for: descriptor, using: .udp)
        nwBrowser.stateUpdateHandler = { _ in }
        nwBrowser.browseResultsChangedHandler = { _, _ in }
        nwBrowser.start(queue: .main)
        self.browser = nwBrowser
    }

    private func connectAllSources() {
        let count = MIDIGetNumberOfSources()
        for i in 0..<count {
            let src = MIDIGetSource(i)
            let err = MIDIPortConnectSource(inputPort, src, nil)
            if err != noErr {
                print("[MIDI] connect source \(i) error: \(err)")
            }
        }

        // Belt-and-suspenders: explicitly connect to the network session's source endpoint
        let session = MIDINetworkSession.default()
        let networkSrc = session.sourceEndpoint()
        if networkSrc != 0 {
            let err = MIDIPortConnectSource(inputPort, networkSrc, nil)
            if err != noErr {
                print("[MIDI] network source connect error: \(err)")
            }
        }
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

        var packetList = MIDIPacketList()
        var pkt = MIDIPacketListInit(&packetList)
        var bytes: [UInt8] = [status, data1, data2]
        pkt = MIDIPacketListAdd(&packetList, MemoryLayout<MIDIPacketList>.size, pkt, 0, 3, &bytes)
        let nerr = MIDISend(outputPort, networkDest, &packetList)
        if nerr != noErr {
            print("[MIDI] MIDISend (network) error: \(nerr)")
        }
    }

    private func handleIncomingMIDI(_ packetListPtr: UnsafePointer<MIDIPacketList>) {
        let packetList = packetListPtr.pointee
        var packet = packetList.packet
        for _ in 0..<packetList.numPackets {
            let length = Int(packet.length)
            guard length >= 3 else {
                packet = MIDIPacketNext(&packet).pointee
                continue
            }
            withUnsafePointer(to: packet.data) { tuplePtr in
                tuplePtr.withMemoryRebound(to: UInt8.self, capacity: length) { bytes in
                    var offset = 0
                    while offset + 2 < length {
                        let status = bytes[offset]
                        let data1 = bytes[offset + 1]
                        let data2 = bytes[offset + 2]

                        // Only process channel 15 note-on (0x9E) for MidiLink
                        if status == 0x9E {
                            if let message = decoder.feed(status: status, note: data1, velocity: data2) {
                                if let growl = message.growl {
                                    DispatchQueue.main.async { [weak self] in
                                        self?.showGrowl(growl)
                                    }
                                }
                            }
                        }

                        offset += 3
                    }
                }
            }

            packet = MIDIPacketNext(&packet).pointee
        }
    }

    private func showGrowl(_ text: String) {
        growlClearWork?.cancel()
        latestGrowl = text
        let work = DispatchWorkItem { [weak self] in
            self?.latestGrowl = nil
        }
        growlClearWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: work)
    }

    deinit {
        for obs in notificationObservers {
            NotificationCenter.default.removeObserver(obs)
        }
        MIDIEndpointDispose(source)
        MIDIPortDispose(inputPort)
        MIDIClientDispose(client)
    }
}
