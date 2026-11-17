package com.kaltura.avatar

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.kaltura.avatar.ui.theme.Brand
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private val LauncherSize = 56.dp
private val Gutter = 12.dp
private const val ExpandDuration = 260

private fun clamp(value: Float, min: Float, max: Float) = min(max(value, min), max)

/**
 * Draggable "AI" launcher that floats above the app content. Tapping it opens the avatar full screen inside
 * the safe area; the avatar closes itself when the SDK reports that the session is disconnecting.
 *
 * Launcher offsets are measured from the bottom-right corner of the draggable region, so they are always <= 0.
 * The region stops above the tab bar ([tabBarHeight]) and the launcher is pushed up while the plan sheet
 * ([sheetVisibleHeight] px from the screen bottom) is open.
 */
@Composable
fun Avatar(tabBarHeight: Int, sheetVisibleHeight: Int) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val slop = LocalViewConfiguration.current.touchSlop
    val scope = rememberCoroutineScope()

    var expanded by remember { mutableStateOf(false) }
    var container by remember { mutableStateOf(IntSize.Zero) }
    val progress = remember { Animatable(0f) }
    val x = remember { Animatable(0f) }
    val y = remember { Animatable(0f) }

    val obstacleTarget = max(0f, (sheetVisibleHeight - tabBarHeight).toFloat())
    val obstacle by animateFloatAsState(obstacleTarget, tween(300), label = "obstacle")
    val currentObstacle by rememberUpdatedState(obstacle)

    val launcherPx = with(density) { LauncherSize.toPx() }
    val currentContainer by rememberUpdatedState(container)
    val currentExpanded by rememberUpdatedState(expanded)

    val onDisconnecting by rememberUpdatedState {
        expanded = false
        scope.launch { progress.snapTo(0f) }
    }

    val controller = remember { AvatarController(context, onDisconnecting = { onDisconnecting() }) }
    var pendingPermission by remember { mutableStateOf<PermissionRequest?>(null) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        pendingPermission?.let { request ->
            if (granted) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else request.deny()
        }
        pendingPermission = null
    }

    LaunchedEffect(container) {
        if (container == IntSize.Zero) return@LaunchedEffect

        val clampedX = clamp(x.value, launcherPx - container.width, 0f)
        val clampedY = clamp(y.value, launcherPx - container.height, 0f)

        if (clampedX != x.value) launch { x.animateTo(clampedX, spring()) }
        if (clampedY != y.value) launch { y.animateTo(clampedY, spring()) }
    }

    LaunchedEffect(expanded) {
        if (!expanded) return@LaunchedEffect
        launch { progress.animateTo(1f, tween(ExpandDuration, easing = FastOutSlowInEasing)) }
        snapshotFlow { dynamicVariables().toString() }
            .distinctUntilChanged()
            .drop(1)
            .collect { controller.onScreenChanged(JSONObject(it)) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
                .padding(bottom = with(density) { tabBarHeight.toDp() })
                .padding(Gutter)
                .onSizeChanged { container = it },
        ) {
            if (container != IntSize.Zero) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .offset { IntOffset(x.value.roundToInt(), min(y.value, -currentObstacle).roundToInt()) }
                        .size(LauncherSize)
                        // Hidden, not removed, while the avatar is open so the launcher keeps its position.
                        .alpha(if (expanded) 0f else 1f)
                        .dragWindow(
                            slop = slop,
                            enabled = { !currentExpanded },
                            onStart = {
                                scope.launch {
                                    x.stop()
                                    y.stop()
                                    y.snapTo(min(y.value, -currentObstacle))
                                }
                            },
                            onDrag = { delta ->
                                scope.launch {
                                    val bounds = currentContainer
                                    x.snapTo(clamp(x.value + delta.x, launcherPx - bounds.width, 0f))
                                    y.snapTo(
                                        clamp(
                                            y.value + delta.y,
                                            launcherPx - bounds.height,
                                            max(-currentObstacle, launcherPx - bounds.height),
                                        ),
                                    )
                                }
                            },
                            onEnd = {
                                scope.launch {
                                    val leftEdge = launcherPx - currentContainer.width
                                    x.animateTo(if (x.value < leftEdge / 2) leftEdge else 0f, spring())
                                }
                            },
                        )
                        .shadow(10.dp, CircleShape)
                        .background(Color.White, CircleShape)
                        .clip(CircleShape)
                        // Without a clickable while open, touches reach whatever is drawn above this button.
                        .then(if (expanded) Modifier else Modifier.clickable { expanded = true }),
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            painterResource(R.drawable.ic_sparkles),
                            contentDescription = "Open AI assistant",
                            modifier = Modifier.size(20.dp),
                            tint = Brand,
                        )
                        Text(
                            "AI",
                            modifier = Modifier.padding(start = 4.dp),
                            fontSize = 13.sp,
                            lineHeight = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Brand,
                        )
                    }
                }
            }
        }

        if (expanded) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(progress.value)
                    .background(Color.White)
                    .windowInsetsPadding(WindowInsets.systemBars)
                    // Registers the overlay for touches so nothing underneath, such as the app's tabs, gets them.
                    .pointerInput(Unit) {},
            ) {
                AvatarContent(
                    controller = controller,
                    modifier = Modifier.fillMaxSize(),
                    onMicPermission = { request ->
                        val granted = ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.RECORD_AUDIO,
                        ) == PackageManager.PERMISSION_GRANTED

                        if (granted) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        } else {
                            pendingPermission = request
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    },
                    onMicPermissionCanceled = { request ->
                        if (pendingPermission === request) pendingPermission = null
                    },
                )
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun AvatarContent(
    controller: AvatarController,
    modifier: Modifier,
    onMicPermission: (PermissionRequest) -> Unit,
    onMicPermissionCanceled: (PermissionRequest) -> Unit,
) {
    if (!avatarConfigured) {
        Box(modifier, contentAlignment = Alignment.Center) {
            Text("Set PARTNER_ID and WIDGET_ID in .env", fontSize = 12.sp, modifier = Modifier.padding(12.dp))
        }
        return
    }

    val onPermission by rememberUpdatedState(onMicPermission)
    val onPermissionCanceled by rememberUpdatedState(onMicPermissionCanceled)

    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
                overScrollMode = WebView.OVER_SCROLL_NEVER
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

                webChromeClient = object : WebChromeClient() {
                    override fun onPermissionRequest(request: PermissionRequest) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE in request.resources) {
                            onPermission(request)
                        } else {
                            request.deny()
                        }
                    }

                    override fun onPermissionRequestCanceled(request: PermissionRequest) {
                        onPermissionCanceled(request)
                    }

                    // The page logs the member's context, so keep its console out of release logs.
                    override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                        if (BuildConfig.DEBUG) {
                            Log.d("Avatar", "${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                        }
                        return true
                    }
                }

                addJavascriptInterface(controller, AvatarController.BRIDGE_NAME)
                controller.webView = this
                controller.load(this)
            }
        },
        onRelease = { view ->
            controller.webView = null
            view.removeJavascriptInterface(AvatarController.BRIDGE_NAME)
            view.destroy()
        },
    )
}

/**
 * Observes pointers before children (Initial pass) so the launcher's tap still works, and only
 * takes over once the finger moves past the touch slop.
 */
private fun Modifier.dragWindow(
    slop: Float,
    enabled: () -> Boolean,
    onStart: () -> Unit,
    onDrag: (Offset) -> Unit,
    onEnd: () -> Unit,
): Modifier = pointerInput(slop) {
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        var total = Offset.Zero
        var dragging = false

        while (true) {
            val event = awaitPointerEvent(PointerEventPass.Initial)
            val change = event.changes.firstOrNull { it.id == down.id } ?: break

            if (!change.pressed) break

            val delta = change.positionChange()
            total += delta

            if (!dragging && total.getDistance() > slop && enabled()) {
                dragging = true
                onStart()
            }

            if (dragging) {
                change.consume()
                onDrag(delta)
            }
        }

        if (dragging) onEnd()
    }
}
