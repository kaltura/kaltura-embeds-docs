import SwiftUI

// One entry per thing the agent can do here: voice, then each client tool, then the avatar itself.
private struct Capability: Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String
    var example: String?
}

private let capabilities = [
    Capability(
        id: "talk",
        title: "Talk to the agent",
        description: "Speak naturally. The agent listens, answers by voice, and stays on screen while you use the app.",
        icon: "mic",
        example: "\"Hi, what can you help me with?\""
    ),
    Capability(
        id: "summary",
        title: "Ask about your workouts",
        description: "The agent reads your training summary for this week, last week or the last 4 weeks and answers with your numbers.",
        icon: "search-list",
        example: "\"How did last week go?\""
    ),
    Capability(
        id: "navigate",
        title: "Navigate the app",
        description: "Ask the agent to open Home, Workouts, Progress or Plan, and to pick the period shown on Progress.",
        icon: "swap",
        example: "\"Show me my progress for the last 4 weeks.\""
    ),
    Capability(
        id: "plan",
        title: "Plan your week",
        description: "The agent proposes a plan and opens it in a bottom sheet. Edit it, save or dismiss, and the agent reacts to what you chose.",
        icon: "calendar",
        example: "\"Plan my next week, I want to run in the mornings.\""
    ),
    Capability(
        id: "avatar",
        title: "Move the avatar aside",
        description: "Drag the avatar anywhere so it never covers what you are reading. Tap the cross to end the session.",
        icon: "move"
    ),
]

// One duration for the size change, the text fade and the chevron, so the card and its text finish together.
private let accordionAnimation = Animation.easeInOut(duration: 0.22)

struct HomeScreen: View {
    @State private var openId: String? = capabilities.first?.id

    var body: some View {
        ScreenContainer("Try Kaltura Agent", header: { brand }) {
            infoCard

            Text("What you can do in this MVP")
                .font(.system(size: 15))
                .foregroundStyle(Theme.muted)
                .padding(.top, 24)
                .padding(.bottom, 12)

            VStack(spacing: 8) {
                ForEach(capabilities) { capability in
                    CapabilityCard(capability: capability, open: capability.id == openId) {
                        withAnimation(accordionAnimation) {
                            openId = openId == capability.id ? nil : capability.id
                        }
                    }
                }
            }
        }
    }

    private var brand: some View {
        HStack(spacing: 8) {
            Image("kaltura-mark")
                .resizable()
                .scaledToFit()
                .frame(width: 40, height: 40)

            Text("kaltura")
                .font(.system(size: 32, weight: .semibold))
                .tracking(-1)
                .foregroundStyle(Theme.ink)
        }
        .padding(.bottom, 12)
    }

    private var infoText: AttributedString {
        var lead = AttributedString("Demo app.")
        lead.font = .system(size: 15, weight: .bold)
        lead.foregroundColor = Theme.ink

        return lead + AttributedString(" This app shows how to embed Kaltura Agent in a native app. The workout data is sample content.")
    }

    private var infoCard: some View {
        HStack(alignment: .top, spacing: 12) {
            Icon(name: "info", size: 24)
                .foregroundStyle(Theme.brand)

            Text(infoText)
                .font(.system(size: 15))
            .lineSpacing(4)
            .foregroundStyle(Theme.infoInk)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct CapabilityCard: View {
    let capability: Capability
    let open: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onTap) {
                HStack(spacing: 14) {
                    Icon(name: capability.icon, size: 24)
                        .foregroundStyle(Theme.brand)
                        .frame(width: 44, height: 44)
                        .background(Theme.brandTint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                    Text(capability.title)
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Icon(name: "chevron-down", size: 24)
                        .foregroundStyle(Theme.muted)
                        .rotationEffect(.degrees(open ? 180 : 0))
                }
                .padding(12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(capability.title)
            .accessibilityHint(open ? "Collapse" : "Expand")

            if open {
                VStack(alignment: .leading, spacing: 12) {
                    Text(capability.description)
                        .font(.system(size: 15))
                        .lineSpacing(4)
                        .foregroundStyle(Theme.bodyInk)

                    if let example = capability.example {
                        Text(example)
                            .font(.system(size: 15))
                            .lineSpacing(4)
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(Theme.exampleBorder, lineWidth: 0.5)
                            )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .transition(.opacity)
            }
        }
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .clipped()
    }
}
