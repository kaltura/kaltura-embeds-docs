import SwiftUI

struct ScreenContainer<Header: View, Content: View>: View {
    let title: String
    let header: Header
    let content: () -> Content

    init(
        _ title: String,
        @ViewBuilder header: () -> Header,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.header = header()
        self.content = content
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header

                Text(title)
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundStyle(Theme.ink)
                    .padding(.bottom, 16)

                content()
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 96)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.screenBackground)
    }
}

extension ScreenContainer where Header == EmptyView {
    init(_ title: String, @ViewBuilder content: @escaping () -> Content) {
        self.init(title, header: { EmptyView() }, content: content)
    }
}
