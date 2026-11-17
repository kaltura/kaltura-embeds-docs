import Foundation

// propose_workout_plan does not wait for the member (Wait for response is off), so the agent keeps talking while the
// sheet is open. When the member saves or dismisses, the app only sends this trigger text; the agent then calls
// get_plan_result to read the decision.
let planDecidedEvent = "[app event] plan_decided"

private func optString(_ value: Any?) -> String? {
    guard let value, !(value is NSNull) else { return nil }

    return value as? String ?? "\(value)"
}

private func ok(_ fields: [String: Any] = [:]) -> [String: Any] {
    ["ok": true].merging(fields) { _, new in new }
}

private func failure(_ message: String) -> [String: Any] {
    ["ok": false, "error": message]
}

private func periodError(_ period: String) -> String {
    "unknown period \"\(period)\"; use \(Period.allCases.map(\.rawValue).joined(separator: ", "))"
}

private func savedDecision(_ plan: Plan, edited: Bool) -> [String: Any] {
    [
        "status": "saved",
        "days": plan.days.map(\.rawValue).joined(separator: ","),
        "time": plan.time,
        "intensity": plan.intensity.rawValue,
        "duration_min": plan.durationMin,
        "rest_day_after": plan.restDayAfter,
        "edited": edited,
    ]
}

private enum ParsedPlan {
    case valid(Plan)
    case invalid(String)
}

private func parseProposedPlan(_ args: [String: Any]) -> ParsedPlan {
    let rawDays = optString(args["days"]) ?? ""
    let requested = rawDays
        .split(separator: ",")
        .map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
        .filter { !$0.isEmpty }
    let invalidDay = requested.first { Day(rawValue: $0) == nil }

    if requested.isEmpty || invalidDay != nil {
        let allowed = Day.allCases.map(\.rawValue).joined(separator: ",")

        return .invalid("invalid day \"\(invalidDay ?? rawDays)\"; use \(allowed)")
    }

    let time = optString(args["time"]) ?? ""

    if time.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) == nil {
        return .invalid("invalid time \"\(time)\"; use HH:MM, 24h")
    }

    let rawIntensity = optString(args["intensity"]) ?? ""

    guard let intensity = Intensity(rawValue: rawIntensity) else {
        let allowed = Intensity.allCases.map(\.rawValue).joined(separator: ", ")

        return .invalid("invalid intensity \"\(rawIntensity)\"; use \(allowed)")
    }

    let requestedDuration = (args["duration_min"] as? NSNumber)?.doubleValue ?? Double(defaultDuration)
    let duration = min(Double(maxDuration), max(Double(minDuration), requestedDuration))

    return .valid(
        Plan(
            days: Day.allCases.filter { requested.contains($0.rawValue) },
            time: time,
            intensity: intensity,
            durationMin: Int((duration / Double(durationStep)).rounded()) * durationStep,
            restDayAfter: (args["rest_day_after"] as? Bool) ?? true
        )
    )
}

final class NativeTools {
    private let tellAgent: (String) -> Void

    // What the member did with the last plan sheet the agent opened; read by get_plan_result.
    private var planDecision: [String: Any] = ["status": "open"]
    private var latestProposal = 0

    init(tellAgent: @escaping (String) -> Void) {
        self.tellAgent = tellAgent
    }

    /// `respond` receives the full `{ id, data }` / `{ id, error }` envelope for `window.onToolResult`.
    func call(id: Int, name: String, args: [String: Any], respond: @escaping ([String: Any]) -> Void) {
        func data(_ payload: [String: Any]) {
            respond(["id": id, "data": payload])
        }

        switch name {
        case "get_training_summary":
            let rawPeriod = optString(args["period"]) ?? Period.lastWeek.rawValue

            guard let period = Period(rawValue: rawPeriod), let summary = trainingSummary[period] else {
                data(failure(periodError(rawPeriod)))
                return
            }

            data(ok(["period": period.rawValue]).merging(summary.json) { _, new in new })

        case "go_to":
            let destination = optString(args["destination"]) ?? ""
            let rawPeriod = optString(args["period"])

            guard let tab = Tab(rawValue: destination) else {
                let allowed = Tab.allCases.map(\.rawValue).joined(separator: ", ")

                data(failure("unknown destination \"\(destination)\"; use \(allowed)"))
                return
            }

            if tab == .progress, let rawPeriod {
                guard let period = Period(rawValue: rawPeriod) else {
                    data(failure(periodError(rawPeriod)))
                    return
                }

                appStore.progressPeriod = period
            }

            appStore.currentTab = tab

            var result: [String: Any] = ["destination": tab.rawValue]

            if tab == .progress {
                result["period"] = appStore.progressPeriod.rawValue
            }

            data(ok(result))

        case "propose_workout_plan":
            switch parseProposedPlan(args) {
            case .invalid(let message):
                data(failure(message))

            case .valid(let plan):
                // Opening a sheet settles the previous one (its onDismiss runs). Only the latest proposal may report a decision.
                latestProposal += 1

                let proposalId = latestProposal
                let decide: ([String: Any], Bool) -> Void = { [weak self] decision, notify in
                    guard let self, proposalId == self.latestProposal else { return }

                    self.planDecision = decision

                    if notify {
                        self.tellAgent(planDecidedEvent)
                    }
                }

                planDecision = ["status": "open"]

                workoutPlanBus.open(
                    WorkoutPlanRequest(
                        plan: plan,
                        suggested: true,
                        onSave: { saved, edited in decide(savedDecision(saved, edited: edited), true) },
                        // Backgrounding closes the sheet but is not a member decision: record it, do not wake the agent.
                        onDismiss: { reason in decide(["status": "dismissed"], reason == .member) }
                    )
                )

                // The tool does not wait for the member: answer as soon as the sheet is open so the agent can keep talking.
                data(ok(["opened": true]))
            }

        case "get_plan_result":
            data(ok(planDecision))

        default:
            respond(["id": id, "error": "Unknown native tool: \(name)"])
        }
    }
}
