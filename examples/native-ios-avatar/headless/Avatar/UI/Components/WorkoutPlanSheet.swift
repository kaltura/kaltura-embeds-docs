import SwiftUI

private let sheetShape = UnevenRoundedRectangle(topLeadingRadius: 24, topTrailingRadius: 24, style: .continuous)

private func pad(_ value: Int) -> String {
    value < 10 ? "0\(value)" : "\(value)"
}

/// Drawn in the same view tree as the app (not a system sheet) so the avatar can stay on top of it.
/// `onVisibleHeightChange` reports how many points of the screen bottom the sheet covers.
struct WorkoutPlanSheet: View {
    let onVisibleHeightChange: (CGFloat) -> Void

    @State private var sheetHeight: CGFloat = 0

    var body: some View {
        let request = workoutPlanBus.request

        GeometryReader { proxy in
            ZStack(alignment: .bottom) {
                if let request {
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()
                        .onTapGesture { workoutPlanBus.settle() }
                        .transition(.opacity)

                    PlanForm(request: request)
                        .id(request.id)
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                        .padding(.bottom, 20)
                        .frame(maxWidth: .infinity)
                        .readHeight { sheetHeight = $0 }
                        .background(
                            sheetShape
                                .fill(Color.white)
                                .shadow(color: .black.opacity(0.2), radius: 12)
                                .ignoresSafeArea(edges: .bottom)
                        )
                        .transition(.move(edge: .bottom))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .animation(.easeInOut(duration: 0.3), value: request?.id)
            .onChange(of: request?.id) { _, _ in
                report(visible: request != nil, safeBottom: proxy.safeAreaInsets.bottom)
            }
            .onChange(of: sheetHeight) { _, _ in
                report(visible: request != nil, safeBottom: proxy.safeAreaInsets.bottom)
            }
        }
    }

    private func report(visible: Bool, safeBottom: CGFloat) {
        onVisibleHeightChange(visible ? sheetHeight + safeBottom : 0)
    }
}

private struct PlanForm: View {
    let request: WorkoutPlanRequest

    @State private var selectedDays: [Day]
    @State private var time: String
    @State private var intensity: Intensity
    @State private var durationMin: Int
    @State private var restDayAfter: Bool

    init(request: WorkoutPlanRequest) {
        self.request = request
        _selectedDays = State(initialValue: request.plan.days)
        _time = State(initialValue: request.plan.time)
        _intensity = State(initialValue: request.plan.intensity)
        _durationMin = State(initialValue: request.plan.durationMin)
        _restDayAfter = State(initialValue: request.plan.restDayAfter)
    }

    private var hour: Int { timeParts.hour }
    private var minute: Int { timeParts.minute }
    private var canSave: Bool { !selectedDays.isEmpty }

    private var timeParts: (hour: Int, minute: Int) {
        let parts = time.split(separator: ":").compactMap { Int($0) }

        return parts.count == 2 ? (parts[0], parts[1]) : (6, 30)
    }

    var body: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(Theme.sheetHandle)
                .frame(width: 40, height: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text("Your new plan")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.sheetInk)

                if request.suggested {
                    Text("Suggested by your coach")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.brand)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            daysField
            timeField
            intensityField

            fieldRow("Duration") {
                stepper(
                    value: "\(durationMin) min",
                    onDecrement: { durationMin = min(maxDuration, max(minDuration, durationMin - durationStep)) },
                    onIncrement: { durationMin = min(maxDuration, max(minDuration, durationMin + durationStep)) }
                )
            }

            fieldRow("Rest day after hard sessions") {
                Toggle("Rest day after hard sessions", isOn: $restDayAfter)
                    .labelsHidden()
                    .tint(Theme.brand)
            }

            buttons
        }
    }

    // MARK: Fields

    private var daysField: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel("Days")

            HStack {
                ForEach(Day.allCases, id: \.self) { day in
                    let active = selectedDays.contains(day)

                    Button {
                        selectedDays = Day.allCases.filter { ($0 == day) != selectedDays.contains($0) }
                    } label: {
                        Text(day.label)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(active ? Color.white : Theme.sheetMuted)
                            .frame(width: 42, height: 36)
                            .background(
                                active ? Theme.brand : Theme.sheetFill,
                                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                            )
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private var timeField: some View {
        fieldRow("Time") {
            HStack(spacing: 6) {
                stepper(
                    value: pad(hour),
                    onDecrement: { time = "\(pad((hour - 1 + 24) % 24)):\(pad(minute))" },
                    onIncrement: { time = "\(pad((hour + 1) % 24)):\(pad(minute))" }
                )

                Text(":")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Theme.sheetInk)

                stepper(
                    value: pad(minute),
                    onDecrement: { time = "\(pad(hour)):\(pad((minute - 5 + 60) % 60))" },
                    onIncrement: { time = "\(pad(hour)):\(pad((minute + 5) % 60))" }
                )
            }
        }
    }

    private var intensityField: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel("Intensity")

            HStack(spacing: 0) {
                ForEach(Intensity.allCases, id: \.self) { item in
                    let active = item == intensity

                    Button {
                        intensity = item
                    } label: {
                        Text(item.label)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(active ? Color.white : Theme.sheetMuted)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(
                                active ? Theme.brand : Color.clear,
                                in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(3)
            .background(Theme.sheetFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }

    private var buttons: some View {
        HStack(spacing: 12) {
            Button {
                workoutPlanBus.settle()
            } label: {
                Text("Dismiss")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.sheetInk)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Theme.sheetFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                workoutPlanBus.settle(
                    saved: Plan(
                        days: selectedDays,
                        time: time,
                        intensity: intensity,
                        durationMin: durationMin,
                        restDayAfter: restDayAfter
                    )
                )
            } label: {
                Text("Save")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Theme.brand, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!canSave)
            .opacity(canSave ? 1 : 0.4)
        }
    }

    // MARK: Building blocks

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(Theme.sheetMuted)
    }

    private func fieldRow<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            fieldLabel(label)
            Spacer()
            content()
        }
    }

    private func stepper(value: String, onDecrement: @escaping () -> Void, onIncrement: @escaping () -> Void) -> some View {
        HStack {
            stepperButton("−", action: onDecrement)

            Text(value)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.sheetInk)
                .frame(width: 64)

            stepperButton("+", action: onIncrement)
        }
    }

    private func stepperButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Theme.brand)
                .frame(width: 32, height: 32)
                .background(Theme.brandTint, in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label == "+" ? "Increase" : "Decrease")
    }
}
