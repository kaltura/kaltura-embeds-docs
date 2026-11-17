import SwiftUI

private let chartHeight: CGFloat = 120

struct ProgressScreen: View {
    var body: some View {
        let period = appStore.progressPeriod

        ScreenContainer("Progress") {
            periodPicker(selected: period)

            if let summary = trainingSummary[period] {
                statCards(summary)

                if let weeklyMinutes = summary.weeklyMinutes {
                    weeklyChart(weeklyMinutes)
                }
            }
        }
    }

    private func periodPicker(selected: Period) -> some View {
        HStack(spacing: 0) {
            ForEach(Period.allCases, id: \.self) { item in
                let active = item == selected

                Button {
                    appStore.progressPeriod = item
                } label: {
                    Text(item.label)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(active ? Theme.brand : Theme.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            active ? Color.white : Color.clear,
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Theme.segmentBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .padding(.bottom, 16)
    }

    private func statCards(_ summary: TrainingSummary) -> some View {
        let cards: [(label: String, value: String)] = [
            ("Workouts done", "\(summary.workoutsDone) of \(summary.workoutsPlanned)"),
            ("Active minutes", "\(summary.activeMinutes)"),
            ("Avg intensity", summary.avgIntensity.label),
            ("Rest days", "\(summary.restDays)"),
        ]

        return VStack(spacing: 12) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(0..<2, id: \.self) { column in
                        let card = cards[row * 2 + column]

                        VStack(alignment: .leading, spacing: 4) {
                            Text(card.value)
                                .font(.system(size: 24, weight: .heavy))
                                .foregroundStyle(Theme.brand)
                            Text(card.label)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.muted)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
        }
    }

    private func weeklyChart(_ weeklyMinutes: [Int]) -> some View {
        let maxMinutes = CGFloat(weeklyMinutes.max() ?? 1)

        return VStack(alignment: .leading, spacing: 16) {
            Text("Minutes per week")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Theme.ink)

            HStack(alignment: .bottom) {
                ForEach(Array(weeklyMinutes.enumerated()), id: \.offset) { index, minutes in
                    VStack(spacing: 6) {
                        Text("\(minutes)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Theme.ink)
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Theme.brand)
                            .frame(width: 32, height: chartHeight * CGFloat(minutes) / maxMinutes)
                        Text("Week \(index + 1)")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.muted)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: chartHeight + 44, alignment: .bottom)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.top, 12)
    }
}
