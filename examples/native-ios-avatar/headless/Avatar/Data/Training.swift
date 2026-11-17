import Foundation

enum Period: String, CaseIterable {
    case thisWeek = "this_week"
    case lastWeek = "last_week"
    case last4Weeks = "last_4_weeks"

    var label: String {
        switch self {
        case .thisWeek: "This week"
        case .lastWeek: "Last week"
        case .last4Weeks: "Last 4 weeks"
        }
    }
}

enum Day: String, CaseIterable {
    case mon, tue, wed, thu, fri, sat, sun

    var label: String { rawValue.capitalized }
}

enum Intensity: String, CaseIterable {
    case light, moderate, hard

    var label: String { rawValue.capitalized }
}

struct Plan: Equatable {
    var days: [Day]
    var time: String
    var intensity: Intensity
    var durationMin: Int
    var restDayAfter: Bool
}

struct TrainingSummary {
    let workoutsDone: Int
    let workoutsPlanned: Int
    let activeMinutes: Int
    let avgIntensity: Intensity
    let restDays: Int
    let hardDaysInARow: Int
    let minutesVsPreviousPct: Int
    var weeklyMinutes: [Int]? = nil

    var json: [String: Any] {
        var result: [String: Any] = [
            "workoutsDone": workoutsDone,
            "workoutsPlanned": workoutsPlanned,
            "activeMinutes": activeMinutes,
            "avgIntensity": avgIntensity.rawValue,
            "restDays": restDays,
            "hardDaysInARow": hardDaysInARow,
            "minutesVsPreviousPct": minutesVsPreviousPct,
        ]

        if let weeklyMinutes {
            result["weeklyMinutes"] = weeklyMinutes
        }

        return result
    }
}

struct Workout: Identifiable {
    let id: String
    let date: String
    let type: String
    let minutes: Int
    let intensity: Intensity
}

let workouts = [
    Workout(id: "1", date: "Nov 16", type: "Run", minutes: 38, intensity: .moderate),
    Workout(id: "2", date: "Nov 11", type: "Ride", minutes: 43, intensity: .hard),
    Workout(id: "3", date: "Nov 10", type: "Run", minutes: 40, intensity: .hard),
    Workout(id: "4", date: "Nov 9", type: "Strength", minutes: 45, intensity: .hard),
    Workout(id: "5", date: "Nov 5", type: "Run", minutes: 50, intensity: .moderate),
    Workout(id: "6", date: "Nov 3", type: "Yoga", minutes: 30, intensity: .light),
]

let trainingSummary: [Period: TrainingSummary] = [
    .thisWeek: TrainingSummary(
        workoutsDone: 1,
        workoutsPlanned: 3,
        activeMinutes: 38,
        avgIntensity: .moderate,
        restDays: 0,
        hardDaysInARow: 1,
        minutesVsPreviousPct: -70
    ),
    .lastWeek: TrainingSummary(
        workoutsDone: 3,
        workoutsPlanned: 5,
        activeMinutes: 128,
        avgIntensity: .hard,
        restDays: 1,
        hardDaysInARow: 3,
        minutesVsPreviousPct: -15
    ),
    .last4Weeks: TrainingSummary(
        workoutsDone: 14,
        workoutsPlanned: 20,
        activeMinutes: 638,
        avgIntensity: .hard,
        restDays: 5,
        hardDaysInARow: 3,
        minutesVsPreviousPct: -33,
        weeklyMinutes: [190, 170, 150, 128]
    ),
]

let defaultPlan = Plan(
    days: [.mon, .tue, .wed, .fri, .sat],
    time: "06:30",
    intensity: .hard,
    durationMin: 45,
    restDayAfter: false
)

enum Member {
    static let name = "Alex"
    static let goal = "Run a 10K in 8 weeks"
}

let minDuration = 20
let maxDuration = 90
let durationStep = 5
let defaultDuration = 45
