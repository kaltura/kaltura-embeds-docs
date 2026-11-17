import SwiftUI

struct RootView: View {
    @State private var tabBarHeight: CGFloat = 0
    @State private var sheetVisibleHeight: CGFloat = 0
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                screen
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                TabBar()
                    .readHeight { tabBarHeight = $0 }
            }
            .background(Theme.screenBackground.ignoresSafeArea())

            WorkoutPlanSheet { sheetVisibleHeight = $0 }

            // Last, so the avatar stays on top of the plan sheet.
            AvatarWindow(tabBarHeight: tabBarHeight, sheetVisibleHeight: sheetVisibleHeight)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                workoutPlanBus.settle(reason: .lifecycle)
            }
        }
    }

    @ViewBuilder
    private var screen: some View {
        switch appStore.currentTab {
        case .home: HomeScreen()
        case .workouts: WorkoutsScreen()
        case .progress: ProgressScreen()
        case .plan: PlanScreen()
        }
    }
}

private struct TabBar: View {
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases) { tab in
                let selected = tab == appStore.currentTab

                Button {
                    appStore.currentTab = tab
                } label: {
                    VStack(spacing: 4) {
                        Icon(name: tab.icon, size: 24)
                        Text(tab.label)
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(selected ? Theme.brand : Theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        selected ? Theme.brandTint : Color.clear,
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.label)
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 6)
        .padding(.bottom, 2)
        .background(Color.white.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            Divider()
        }
    }
}
