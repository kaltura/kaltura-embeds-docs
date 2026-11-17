import Foundation
import WebKit

private let threadKey = "threadId"
private let baseURL = URL(string: "https://example.com")

/// PARTNER_ID and WIDGET_ID, read from Info.plist where Xcode expands them from Config.xcconfig and your `.env`.
enum AvatarConfig {
    static var partnerId: String { value(for: "PartnerID") }
    static var widgetId: String { value(for: "WidgetID") }
    static var isConfigured: Bool { Int64(partnerId) != nil && !widgetId.isEmpty }

    private static func value(for key: String) -> String {
        let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String ?? ""

        return raw.trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
    }
}

func dynamicVariables() -> [String: Any] {
    [
        "memberName": Member.name,
        "goal": Member.goal,
        "currentScreen": appStore.currentTab.label,
        "progressPeriod": appStore.progressPeriod.rawValue,
    ]
}

/// JSON text for a value that is safe to paste into the page's script (slashes are escaped, so `</script>` cannot appear).
func jsonString(_ value: Any) -> String {
    guard JSONSerialization.isValidJSONObject(value) || value is String,
          let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed, .sortedKeys]),
          let text = String(data: data, encoding: .utf8)
    else {
        return "null"
    }

    return text
}

/// Owns the WKWebView, the JSON bridge to the page and the saved conversation thread.
final class AvatarController: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    private static let bridgeName = "avatar"
    private static let consoleName = "console"

    private let defaults = UserDefaults.standard
    private lazy var tools = NativeTools(tellAgent: { [weak self] text in self?.tellAgent(text) })

    // After "end" the page may still report a thread id before the WebView is torn down; saving it would resume the ended conversation.
    private var ended = false

    private weak var webView: WKWebView?

    /// Runs when the member taps the end button in the page; the saved thread is cleared first.
    var onEnd: (() -> Void)?

    func makeWebView() -> WKWebView {
        let content = WKUserContentController()
        content.add(self, name: Self.bridgeName)

        #if DEBUG
        // The page logs the member's context, so forward its console to Xcode only in debug builds.
        content.add(self, name: Self.consoleName)
        content.addUserScript(
            WKUserScript(
                source: """
                ['log', 'warn', 'error'].forEach(function (level) {
                  var original = console[level];
                  console[level] = function () {
                    try {
                      window.webkit.messageHandlers.console.postMessage(
                        level + ': ' + Array.prototype.slice.call(arguments).map(String).join(' ')
                      );
                    } catch (e) {}
                    original.apply(console, arguments);
                  };
                });
                """,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        #endif

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = content
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.scrollView.bounces = false
        view.scrollView.showsVerticalScrollIndicator = false
        view.scrollView.showsHorizontalScrollIndicator = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.uiDelegate = self
        view.navigationDelegate = self

        #if DEBUG
        view.isInspectable = true
        #endif

        webView = view
        load(into: view)

        return view
    }

    private func load(into view: WKWebView) {
        ended = false

        guard let url = Bundle.main.url(forResource: "avatar", withExtension: "html"),
              let template = try? String(contentsOf: url, encoding: .utf8)
        else {
            return
        }

        let thread = defaults.string(forKey: threadKey)

        #if DEBUG
        print("Avatar | Loading page, partnerId: '\(AvatarConfig.partnerId)', widgetId: '\(AvatarConfig.widgetId)', thread: \(thread ?? "none")")
        #endif

        let context = thread.map { "{ type: 'thread', threadId: \(jsonString($0)) }" } ?? "undefined"
        let html = template
            .replacingOccurrences(of: "{{DYNAMIC_VARIABLES}}", with: jsonString(dynamicVariables()))
            .replacingOccurrences(of: "{{PARTNER_ID}}", with: AvatarConfig.partnerId)
            .replacingOccurrences(of: "{{WIDGET_ID}}", with: jsonString(AvatarConfig.widgetId))
            .replacingOccurrences(of: "{{CONTEXT}}", with: context)

        view.loadHTMLString(html, baseURL: baseURL)
    }

    func inject(_ script: String) {
        webView?.evaluateJavaScript("\(script); true;", completionHandler: nil)
    }

    func onScreenChanged(_ variables: [String: Any]) {
        inject("window.onScreenChanged?.(\(jsonString(variables)))")
    }

    private func tellAgent(_ text: String) {
        inject("window.onAgentText?.(\(jsonString(text)))")
    }

    // MARK: WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        #if DEBUG
        if message.name == Self.consoleName {
            print("Avatar | WebView \(message.body)")
            return
        }
        #endif

        guard message.name == Self.bridgeName,
              let body = message.body as? String,
              let data = body.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String
        else {
            return
        }

        // Payloads carry the member's context and tool arguments, so keep them out of release logs.
        #if DEBUG
        print("Avatar | Received message - \(body)")
        #endif

        switch type {
        case "thread":
            if !ended, let id = json["id"] as? String {
                defaults.set(id, forKey: threadKey)
            }

        case "error":
            print("Avatar | \(json["reason"] as? String ?? "unknown error")")

        case "end":
            ended = true
            defaults.removeObject(forKey: threadKey)
            onEnd?()

        case "tool":
            guard let tool = json["tool"] as? [String: Any],
                  let id = (tool["id"] as? NSNumber)?.intValue,
                  let name = tool["name"] as? String
            else {
                return
            }

            tools.call(id: id, name: name, args: tool["args"] as? [String: Any] ?? [:]) { [weak self] result in
                self?.inject("window.onToolResult?.(\(jsonString(result)))")
            }

        default:
            break
        }
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Avatar | Page failed to load: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("Avatar | Page failed to load: \(error.localizedDescription)")
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        print("Avatar | The web content process ended")
    }

    // MARK: WKUIDelegate

    /// The page asks for the microphone. iOS still shows its own permission prompt the first time.
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(type == .microphone ? .grant : .deny)
    }
}
