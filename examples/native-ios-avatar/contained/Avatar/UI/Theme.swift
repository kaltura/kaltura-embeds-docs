import SwiftUI

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

enum Theme {
    static let brand = Color(hex: 0x006EFA)
    static let brandPressed = Color(hex: 0x0057C8)
    static let brandTint = Color(hex: 0xE5F0FF)

    static let ink = Color(hex: 0x1C1C1E)
    static let muted = Color(hex: 0x8E8E93)
    static let screenBackground = Color(hex: 0xF5F5F7)
    static let segmentBackground = Color(hex: 0xE5E5EA)
    static let divider = Color(hex: 0xD1D1D6)
    static let chip = Color(hex: 0xEEEEEE)

    static let light = Color(hex: 0x34C759)
    static let moderate = Color(hex: 0xFF9500)
    static let hard = Color(hex: 0xDA2128)

    static let sheetInk = Color(hex: 0x1E2227)
    static let sheetMuted = Color(hex: 0x56606A)
    static let sheetFill = Color(hex: 0xF3F5F7)
    static let sheetHandle = Color(hex: 0xD0D5DA)

    static let infoInk = Color(hex: 0x3A3A3C)
    static let bodyInk = Color(hex: 0x6C6C70)
    static let exampleBorder = Color(hex: 0xC7C7CC)
}

extension Intensity {
    var color: Color {
        switch self {
        case .light: Theme.light
        case .moderate: Theme.moderate
        case .hard: Theme.hard
        }
    }
}

/// A vector icon from the asset catalog, tinted with the current foreground style.
struct Icon: View {
    let name: String
    var size: CGFloat = 24

    var body: some View {
        Image(name)
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
    }
}

extension View {
    /// Reports this view's laid-out height, including its first layout, and whenever it changes.
    func readHeight(_ onChange: @escaping (CGFloat) -> Void) -> some View {
        onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.height
        } action: { height in
            onChange(height)
        }
    }
}
