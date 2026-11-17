import SwiftUI

private let launcherSize: CGFloat = 56
private let gutter: CGFloat = 12
private let expandDuration = 0.26
private let dragSlop: CGFloat = 8

private let spring = Animation.spring(duration: 0.35, bounce: 0.2)

private func clamp(_ value: CGFloat, _ lower: CGFloat, _ upper: CGFloat) -> CGFloat {
    min(max(value, lower), upper)
}

/// The area the launcher can be dragged in: above the tab bar, with a gutter on every side.
private struct Region {
    let width: CGFloat
    let height: CGFloat
    let obstacle: CGFloat
}

/// Draggable "AI" launcher that floats above the app content. Tapping it opens the avatar full screen inside the
/// safe area; the avatar closes itself when the SDK reports that the session is disconnecting.
///
/// Launcher offsets are measured from the bottom-trailing corner of the draggable region, so they are always <= 0.
/// The region stops above the tab bar (`tabBarHeight`) and the launcher is pushed up while the plan sheet
/// (`sheetVisibleHeight` points from the screen bottom) is open.
struct AvatarWindow: View {
    let tabBarHeight: CGFloat
    let sheetVisibleHeight: CGFloat

    @State private var controller = AvatarController()
    @State private var expanded = false
    @State private var overlayOpacity: Double = 0
    @State private var x: CGFloat = 0
    @State private var y: CGFloat = 0
    @State private var dragOrigin: CGPoint?

    private var variablesKey: String { jsonString(dynamicVariables()) }

    var body: some View {
        ZStack {
            GeometryReader { proxy in
                let region = Region(
                    width: max(0, proxy.size.width - gutter * 2),
                    height: max(0, proxy.size.height - tabBarHeight - gutter * 2),
                    obstacle: max(0, sheetVisibleHeight - tabBarHeight - proxy.safeAreaInsets.bottom)
                )

                ZStack(alignment: .bottomTrailing) {
                    launcher
                        .offset(x: x, y: min(y, -region.obstacle))
                        .animation(.easeInOut(duration: 0.3), value: region.obstacle)
                        .simultaneousGesture(dragGesture(region))
                }
                .frame(width: region.width, height: region.height, alignment: .bottomTrailing)
                .offset(x: gutter, y: gutter)
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            }

            if expanded {
                fullScreen
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { controller.onDisconnecting = { close() } }
        .onChange(of: variablesKey) { _, _ in
            if expanded {
                controller.onScreenChanged(dynamicVariables())
            }
        }
    }

    // MARK: Views

    /// Hidden, not removed, while the avatar is open so the launcher keeps its position. Once opened it also takes
    /// no touches, so nothing underneath can react to the avatar's own controls.
    private var launcher: some View {
        Button(action: open) {
            HStack(spacing: 4) {
                Icon(name: "sparkles", size: 20)
                Text("AI")
                    .font(.system(size: 13, weight: .heavy))
            }
            .foregroundStyle(Theme.brand)
            .frame(width: launcherSize, height: launcherSize)
            .background(
                Circle()
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 3)
            )
        }
        .buttonStyle(.plain)
        .opacity(expanded ? 0 : 1)
        .allowsHitTesting(!expanded)
        .accessibilityLabel("Open AI assistant")
    }

    /// The page fills the safe area; the white backdrop also covers the status bar and home indicator areas.
    private var fullScreen: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            avatarContent
        }
        .opacity(overlayOpacity)
    }

    @ViewBuilder
    private var avatarContent: some View {
        if AvatarConfig.isConfigured {
            AvatarWebView(controller: controller)
        } else {
            Text("Set PARTNER_ID and WIDGET_ID in .env")
                .font(.system(size: 12))
                .multilineTextAlignment(.center)
                .padding(12)
        }
    }

    // MARK: Gestures and state changes

    private func dragGesture(_ region: Region) -> some Gesture {
        DragGesture(minimumDistance: dragSlop)
            .onChanged { value in
                guard !expanded else { return }

                let origin = dragOrigin ?? CGPoint(x: x, y: min(y, -region.obstacle))
                dragOrigin = origin

                let minY = launcherSize - region.height
                var transaction = Transaction()
                transaction.disablesAnimations = true

                withTransaction(transaction) {
                    x = clamp(origin.x + value.translation.width, launcherSize - region.width, 0)
                    y = clamp(origin.y + value.translation.height, minY, max(-region.obstacle, minY))
                }
            }
            .onEnded { _ in
                guard dragOrigin != nil else { return }

                dragOrigin = nil

                let leftEdge = launcherSize - region.width

                withAnimation(spring) {
                    x = x < leftEdge / 2 ? leftEdge : 0
                }
            }
    }

    private func open() {
        overlayOpacity = 0
        expanded = true

        withAnimation(.easeOut(duration: expandDuration)) {
            overlayOpacity = 1
        }
    }

    private func close() {
        expanded = false
        overlayOpacity = 0
    }
}
