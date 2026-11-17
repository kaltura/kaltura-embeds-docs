import SwiftUI

private let avatarWidth: CGFloat = 180
private let avatarHeight: CGFloat = 200
private let launcherSize: CGFloat = 56
private let windowRadius: CGFloat = 18
private let gutter: CGFloat = 12
private let expandDuration = 0.26
private let handleWidth: CGFloat = 44
private let handleHeight: CGFloat = 96
private let handleRadius: CGFloat = 18
private let handleBorder: CGFloat = 2
private let dockThreshold: CGFloat = 36
private let maxOvershoot: CGFloat = 64
private let dragSlop: CGFloat = 8

private let spring = Animation.spring(duration: 0.35, bounce: 0.2)

private enum DockSide {
    case left
    case right
}

/// The window is slid off `side` of the screen; `y` is its vertical offset, kept so it comes back to the same height.
private struct Dock: Equatable {
    var side: DockSide
    var y: CGFloat
}

private func clamp(_ value: CGFloat, _ lower: CGFloat, _ upper: CGFloat) -> CGFloat {
    min(max(value, lower), upper)
}

/// Layout numbers shared by the window, the drag gesture and the dock handle.
private struct Metrics {
    let regionWidth: CGFloat
    let regionHeight: CGFloat
    let obstacle: CGFloat
    let insetLeft: CGFloat
    let insetRight: CGFloat
    let progress: CGFloat

    var width: CGFloat { launcherSize + (avatarWidth - launcherSize) * progress }
    var height: CGFloat { launcherSize + (avatarHeight - launcherSize) * progress }
    var radius: CGFloat { launcherSize / 2 + (windowRadius - launcherSize / 2) * progress }
}

/// Draggable avatar window that floats above the app content.
///
/// Offsets are measured from the bottom-trailing corner of the draggable region, so inside the region they are <= 0.
/// The region stops above the tab bar (`tabBarHeight`) and the window is pushed up while the plan sheet
/// (`sheetVisibleHeight` points from the screen bottom) is open. Once opened, the window can be pulled past a side
/// edge to dock there: it then slides fully off screen and a handle on the screen edge brings it back.
struct AvatarWindow: View {
    let tabBarHeight: CGFloat
    let sheetVisibleHeight: CGFloat

    @State private var controller = AvatarController()
    @State private var expanded = false
    @State private var progress: CGFloat = 0
    @State private var x: CGFloat = 0
    @State private var y: CGFloat = 0
    @State private var dock: Dock?
    @State private var restX: CGFloat = 0
    @State private var dragOrigin: CGPoint?

    private var variablesKey: String { jsonString(dynamicVariables()) }

    var body: some View {
        GeometryReader { proxy in
            let metrics = Metrics(
                regionWidth: max(0, proxy.size.width - gutter * 2),
                regionHeight: max(0, proxy.size.height - tabBarHeight - gutter * 2),
                obstacle: max(0, sheetVisibleHeight - tabBarHeight - proxy.safeAreaInsets.bottom),
                insetLeft: gutter + proxy.safeAreaInsets.leading,
                insetRight: gutter + proxy.safeAreaInsets.trailing,
                progress: progress
            )

            ZStack(alignment: .topLeading) {
                ZStack(alignment: .bottomTrailing) {
                    window(metrics)
                        .offset(x: x, y: min(y, -metrics.obstacle))
                        .animation(.easeInOut(duration: 0.3), value: metrics.obstacle)
                        .simultaneousGesture(dragGesture(metrics))
                }
                .frame(width: metrics.regionWidth, height: metrics.regionHeight, alignment: .bottomTrailing)
                .offset(x: gutter, y: gutter)

                if let dock {
                    dockHandle(dock, metrics)
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            .onChange(of: expanded) { _, _ in keepInRegion(metrics) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { controller.onEnd = { endSession() } }
        .onChange(of: variablesKey) { _, _ in
            if expanded {
                controller.onScreenChanged(dynamicVariables())
            }
        }
    }

    // MARK: Views

    private func window(_ metrics: Metrics) -> some View {
        let shape = RoundedRectangle(cornerRadius: metrics.radius, style: .continuous)

        return ZStack(alignment: .bottomTrailing) {
            if expanded {
                avatarContent
                    .frame(width: avatarWidth, height: avatarHeight)
            }

            launcher
        }
        .frame(width: metrics.width, height: metrics.height, alignment: .bottomTrailing)
        .clipShape(shape)
        .background(shape.fill(Color.white).shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 3))
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

    /// Once opened this button sits over the page's end button, so it must not take touches at all.
    private var launcher: some View {
        Button(action: expand) {
            HStack(spacing: 4) {
                Icon(name: "sparkles", size: 20)
                Text("AI")
                    .font(.system(size: 13, weight: .heavy))
            }
            .foregroundStyle(Theme.brand)
            .frame(width: launcherSize, height: launcherSize)
            .background(Color.white)
        }
        .buttonStyle(.plain)
        .opacity(max(0, 1 - progress / 0.4))
        .allowsHitTesting(!expanded)
        .accessibilityLabel("Open AI assistant")
    }

    private func dockHandle(_ dock: Dock, _ metrics: Metrics) -> some View {
        let right = dock.side == .right
        let bottom = tabBarHeight + gutter - dock.y + (avatarHeight - handleHeight) / 2

        return DockHandle(
            side: dock.side,
            y: dock.y,
            minY: avatarHeight - metrics.regionHeight,
            onYChange: { newY in
                self.dock?.y = newY
                y = newY
            },
            onTap: undock
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: right ? .bottomTrailing : .bottomLeading)
        .padding(.bottom, bottom)
    }

    // MARK: Gestures and state changes

    private func dragGesture(_ metrics: Metrics) -> some Gesture {
        DragGesture(minimumDistance: dragSlop)
            .onChanged { value in
                guard dock == nil else { return }

                let origin = dragOrigin ?? CGPoint(x: x, y: min(y, -metrics.obstacle))
                dragOrigin = origin

                let overshoot = expanded ? maxOvershoot : 0
                let minY = metrics.height - metrics.regionHeight
                var transaction = Transaction()
                transaction.disablesAnimations = true

                withTransaction(transaction) {
                    x = clamp(
                        origin.x + value.translation.width,
                        metrics.width - metrics.regionWidth - overshoot,
                        overshoot
                    )
                    y = clamp(origin.y + value.translation.height, minY, max(-metrics.obstacle, minY))
                }
            }
            .onEnded { _ in
                guard dragOrigin != nil else { return }

                dragOrigin = nil
                release(metrics)
            }
    }

    private func release(_ metrics: Metrics) {
        let leftEdge = metrics.width - metrics.regionWidth

        if expanded && x > dockThreshold {
            restX = 0
            dockWindow(.right, metrics)
        } else if expanded && x < leftEdge - dockThreshold {
            restX = leftEdge
            dockWindow(.left, metrics)
        } else {
            withAnimation(spring) {
                x = x < leftEdge / 2 ? leftEdge : 0
            }
        }
    }

    private func dockWindow(_ side: DockSide, _ metrics: Metrics) {
        dock = Dock(side: side, y: y)

        withAnimation(spring) {
            x = side == .right ? metrics.width + metrics.insetRight : -metrics.regionWidth - metrics.insetLeft
        }
    }

    private func undock() {
        dock = nil

        withAnimation(spring) {
            x = restX
        }
    }

    /// Keeps the window inside the draggable region when its size changes.
    private func keepInRegion(_ metrics: Metrics) {
        guard dock == nil else { return }

        let width = expanded ? avatarWidth : launcherSize
        let height = expanded ? avatarHeight : launcherSize

        withAnimation(spring) {
            x = clamp(x, width - metrics.regionWidth, 0)
            y = clamp(y, height - metrics.regionHeight, 0)
        }
    }

    private func expand() {
        expanded = true

        withAnimation(.easeOut(duration: expandDuration)) {
            progress = 1
        }
    }

    private func endSession() {
        if dock != nil {
            x = restX
            dock = nil
        }

        expanded = false

        withAnimation(.easeIn(duration: expandDuration)) {
            progress = 0
        }
    }
}

/// Tab on the screen edge that brings a docked window back. It can be dragged along the edge to pick the return height.
private struct DockHandle: View {
    let side: DockSide
    let y: CGFloat
    let minY: CGFloat
    let onYChange: (CGFloat) -> Void
    let onTap: () -> Void

    @State private var opacity: Double = 0
    @State private var dragDy: CGFloat = 0

    private var right: Bool { side == .right }

    private func clampDy(_ dy: CGFloat) -> CGFloat {
        clamp(dy, minY - y, -y)
    }

    var body: some View {
        let shape = UnevenRoundedRectangle(
            topLeadingRadius: right ? handleRadius : 0,
            bottomLeadingRadius: right ? handleRadius : 0,
            bottomTrailingRadius: right ? 0 : handleRadius,
            topTrailingRadius: right ? 0 : handleRadius,
            style: .continuous
        )

        // One border width wider and nudged past the edge, so the border is only drawn on the inner sides.
        ZStack {
            shape.fill(Theme.brand)
            shape.fill(Color.white).padding(handleBorder)

            VStack(spacing: 6) {
                Icon(name: "chevron-down", size: 24)
                    .rotationEffect(.degrees(right ? 90 : -90))
                Icon(name: "sparkles", size: 24)
            }
            .foregroundStyle(Theme.brand)
        }
        .frame(width: handleWidth + handleBorder, height: handleHeight)
        .shadow(color: .black.opacity(0.25), radius: 8, x: 0, y: 2)
        .offset(x: right ? handleBorder : -handleBorder, y: dragDy)
        .opacity(opacity)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
        .gesture(
            DragGesture(minimumDistance: dragSlop)
                .onChanged { value in
                    dragDy = clampDy(value.translation.height)
                }
                .onEnded { value in
                    onYChange(y + clampDy(value.translation.height))
                    dragDy = 0
                }
        )
        .onAppear {
            withAnimation(.easeOut(duration: 0.2)) {
                opacity = 1
            }
        }
        .accessibilityLabel("Show assistant")
        .accessibilityAddTraits(.isButton)
    }
}
