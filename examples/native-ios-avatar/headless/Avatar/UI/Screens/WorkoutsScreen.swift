import SwiftUI

struct WorkoutsScreen: View {
    var body: some View {
        ScreenContainer("Workouts") {
            VStack(spacing: 12) {
                ForEach(workouts) { workout in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(workout.type)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(Theme.ink)
                            Text("\(workout.date) · \(workout.minutes) min")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.muted)
                        }

                        Spacer()

                        Text(workout.intensity.label)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(workout.intensity.color, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .padding(16)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
        }
    }
}
