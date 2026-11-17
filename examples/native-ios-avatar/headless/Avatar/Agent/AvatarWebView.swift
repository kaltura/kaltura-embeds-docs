import SwiftUI
import WebKit

/// Hosts the controller's web view. The page is loaded when the view is created and released when it goes away.
struct AvatarWebView: UIViewRepresentable {
    let controller: AvatarController

    func makeUIView(context: Context) -> WKWebView {
        controller.makeWebView()
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: ()) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeAllScriptMessageHandlers()
        uiView.configuration.userContentController.removeAllUserScripts()
    }
}
