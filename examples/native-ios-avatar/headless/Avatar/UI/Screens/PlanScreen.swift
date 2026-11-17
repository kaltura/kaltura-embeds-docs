import SwiftUI

private struct Detail: Identifiable {
    let label: String
    let value: String

    var id: String { label }
}

struct PlanScreen: View {
    var body: some View {
        let plan = appStore.plan
        let details = [
            Detail(label: "Time", value: plan.time),
            Detail(label: "Intensity", value: plan.intensity.label),
            Detail(label: "Duration", value: "\(plan.durationMin) min"),
            Detail(label: "Rest day after", value: plan.restDayAfter ? "On" : "Off"),
        ]

        ScreenContainer("Plan") {
            VStack(alignment: .leading, spacing: 0) {
                Text("Your weekly plan")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Theme.ink)

                HStack {
                    ForEach(Day.allCases, id: \.self) { day in
                        let active = plan.days.contains(day)

                        Text(day.label)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(active ? Color.white : Theme.muted)
                            .frame(width: 38, height: 38)
                            .background(active ? Theme.brand : Theme.chip, in: Circle())
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.vertical, 16)

                ForEach(details) { detail in
                    Divider()
                        .overlay(Theme.divider)

                    HStack {
                        Text(detail.label)
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.muted)
                        Spacer()
                        Text(detail.value)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                    }
                    .padding(.vertical, 10)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button {
                workoutPlanBus.open(WorkoutPlanRequest(plan: plan, suggested: false))
            } label: {
                Text("Edit plan")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.brand, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.top, 16)
        }
    }
}
