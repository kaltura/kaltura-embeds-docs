package com.kaltura.avatar

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.kaltura.avatar.data.Member
import com.kaltura.avatar.state.AppStore
import org.json.JSONException
import org.json.JSONObject

private const val TAG = "Avatar"
private const val PREFS = "avatar"
private const val THREAD_ID = "threadId"
private const val BASE_URL = "https://example.com"

val avatarConfigured get() = BuildConfig.PARTNER_ID.toLongOrNull() != null && BuildConfig.WIDGET_ID.isNotBlank()

fun dynamicVariables(): JSONObject = JSONObject()
    .put("memberName", Member.NAME)
    .put("goal", Member.GOAL)
    .put("currentScreen", AppStore.currentTab.label)
    .put("progressPeriod", AppStore.progressPeriod.id)

/** [onDisconnecting] runs when the SDK reports the `disconnecting` connection status, so the app can close the avatar. */
class AvatarController(context: Context, private val onDisconnecting: () -> Unit) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private val tools = NativeTools(tellAgent = { text -> tellAgent(text) })

    var webView: WebView? = null

    fun load(view: WebView) {
        val thread = prefs.getString(THREAD_ID, null)
        val html = view.context.assets.open("avatar.html").bufferedReader().use { it.readText() }
            .replace("{{DYNAMIC_VARIABLES}}", dynamicVariables().toString())
            .replace("{{PARTNER_ID}}", BuildConfig.PARTNER_ID)
            .replace("{{WIDGET_ID}}", JSONObject.quote(BuildConfig.WIDGET_ID))
            .replace(
                "{{CONTEXT}}",
                if (thread != null) {
                    "{ type: 'thread', threadId: ${JSONObject.quote(thread)} }"
                } else {
                    "undefined"
                },
            )

        view.loadDataWithBaseURL(BASE_URL, html, "text/html", "utf-8", null)
    }

    fun injectJavascript(script: String) {
        webView?.evaluateJavascript("$script; true;", null)
    }

    fun onScreenChanged(variables: JSONObject) = injectJavascript("window.onScreenChanged?.($variables)")

    private fun tellAgent(text: String) = injectJavascript("window.onAgentText?.(${JSONObject.quote(text)})")

    // Called by the page on a WebView binder thread.
    @JavascriptInterface
    fun postMessage(data: String) {
        main.post { handleMessage(data) }
    }

    private fun handleMessage(data: String) {
        try {
            val message = JSONObject(data)

            // Payloads carry the member's context and tool arguments, so keep them out of release logs.
            if (BuildConfig.DEBUG) Log.d(TAG, "Received message - $data")

            when (message.getString("type")) {
                "thread" -> prefs.edit().putString(THREAD_ID, message.getString("id")).apply()
                "error" -> Log.e(TAG, message.optString("reason"))
                "status" -> if (message.getString("status") == "disconnecting") onDisconnecting()
                "tool" -> {
                    val tool = message.getJSONObject("tool")
                    tools.call(
                        id = tool.getInt("id"),
                        name = tool.getString("name"),
                        args = tool.optJSONObject("args") ?: JSONObject(),
                    ) { result -> injectJavascript("window.onToolResult?.($result)") }
                }
            }
        } catch (error: JSONException) {
            Log.d(TAG, "Unknown message", error)
        }
    }

    companion object {
        const val BRIDGE_NAME = "AndroidBridge"
    }
}
