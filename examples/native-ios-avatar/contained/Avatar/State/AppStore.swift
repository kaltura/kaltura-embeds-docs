import Foundation
import Observation

enum Tab: String, CaseIterable, Identifiable {
    case home, workouts, progress, plan

    var id: String { rawValue }
    var label: String { rawValue.capitalized }

    /// Name of the vector image in the asset catalog.
    var icon: String {
        switch self {
        case .home: "home"
        case .workouts: "fitness"
        case .progress: "progress"
        case .plan: "calendar"
        }
    }
}

@Observable
final class AppStore {
    var currentTab: Tab = .home
    var progressPeriod: Period = .lastWeek
    var plan: Plan = defaultPlan
}

let appStore = AppStore()

enum DismissReason {
    case member
    case lifecycle
}

struct WorkoutPlanRequest {
    let id = UUID()
    let plan: Plan
    let suggested: Bool
    var onSave: ((_ saved: Plan, _ edited: Bool) -> Void)?
    var onDismiss: ((_ reason: DismissReason) -> Void)?
}

@Observable
final class WorkoutPlanBus {
    private(set) var request: WorkoutPlanRequest?

    func open(_ next: WorkoutPlanRequest) {
        settle()
        request = next
    }

    func settle(saved: Plan? = nil, reason: DismissReason = .member) {
        guard let current = request else { return }

        request = nil

        if let saved {
            appStore.plan = saved
            current.onSave?(saved, saved != current.plan)
        } else {
            current.onDismiss?(reason)
        }
    }
}

let workoutPlanBus = WorkoutPlanBus()
