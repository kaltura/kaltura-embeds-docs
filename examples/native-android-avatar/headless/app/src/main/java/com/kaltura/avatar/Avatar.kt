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
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
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

private val AvatarWidth = 180.dp
private val AvatarHeight = 200.dp
private val LauncherSize = 56.dp
private val WindowRadius = 18.dp
private val Gutter = 12.dp
private const val ExpandDuration = 260
private val HandleWidth = 44.dp
private val HandleHeight = 96.dp
private val HandleRadius = 18.dp
private val HandleBorder = 2.dp
private const val HandleFadeDuration = 200
private val DockThreshold = 36.dp
private val MaxOvershoot = 64.dp

private enum class DockSide { Left, Right }

/** The window is slid off [side] of the screen; [y] is its vertical offset, kept so it comes back to the same height. */
private data class Dock(val side: DockSide, val y: Float)

private fun clamp(value: Float, min: Float, max: Float) = min(max(value, min), max)

/**
 * Draggable avatar window that floats above the app content.
 *
 * Offsets are measured from the bottom-right corner of the draggable region, so inside the region they are <= 0.
 * Once opened, the window can be pulled past a side edge to dock there: it then slides fully off screen
 * (a positive x on the right) and a [DockHandle] on the screen edge brings it back.
 * The region stops above the tab bar ([tabBarHeight]) and the window is pushed up while the plan sheet
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

    val targetWidth = with(density) { (if (expanded) AvatarWidth else LauncherSize).toPx() }
    val targetHeight = with(density) { (if (expanded) AvatarHeight else LauncherSize).toPx() }
    val currentWidth by rememberUpdatedState(targetWidth)
    val currentHeight by rememberUpdatedState(targetHeight)
    val currentContainer by rememberUpdatedState(container)

    var dock by remember { mutableStateOf<Dock?>(null) }
    var restX by remember { mutableFloatStateOf(0f) }
    var wasDocked by remember { mutableStateOf(false) }
    val currentDock by rememberUpdatedState(dock)
    val currentExpanded by rememberUpdatedState(expanded)

    val layoutDirection = LocalLayoutDirection.current
    val gutterPx = with(density) { Gutter.toPx() }
    val dockInsetLeft = WindowInsets.systemBars.getLeft(density, layoutDirection) + gutterPx
    val dockInsetRight = WindowInsets.systemBars.getRight(density, layoutDirection) + gutterPx
    val dockThreshold = with(density) { DockThreshold.toPx() }
    val maxOvershoot = with(density) { MaxOvershoot.toPx() }

    val onEnd by rememberUpdatedState {
        dock = null
        expanded = false
        scope.launch { progress.animateTo(0f, tween(ExpandDuration, easing = FastOutSlowInEasing)) }
    }

    val controller = remember { AvatarController(context, onEnd = { onEnd() }) }
    var pendingPermission by remember { mutableStateOf<PermissionRequest?>(null) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        pendingPermission?.let { request ->
            if (granted) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else request.deny()
        }
        pendingPermission = null
    }

    LaunchedEffect(targetWidth, targetHeight, container) {
        if (container == IntSize.Zero || dock != null) return@LaunchedEffect

        val clampedX = clamp(x.value, targetWidth - container.width, 0f)
        val clampedY = clamp(y.value, targetHeight - container.height, 0f)

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

    // Docking slides the whole window past the screen edge; undocking brings it back to where it rested.
    LaunchedEffect(dock?.side) {
        val side = dock?.side

        if (side != null) {
            wasDocked = true
            x.animateTo(
                if (side == DockSide.Right) currentWidth + dockInsetRight else -currentContainer.width - dockInsetLeft,
                spring(),
            )
        } else if (wasDocked) {
            wasDocked = false
            x.animateTo(restX, spring())
        }
    }

    // Moving the dock handle along the edge decides where the window comes back to.
    LaunchedEffect(dock?.y) {
        dock?.let { y.snapTo(it.y) }
    }

    val shape = RoundedCornerShape(lerp(LauncherSize / 2, WindowRadius, progress.value))
    val width = lerp(LauncherSize, AvatarWidth, progress.value)
    val height = lerp(LauncherSize, AvatarHeight, progress.value)

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
                    .size(width, height)
                    .dragWindow(
                        slop = slop,
                        enabled = { currentDock == null },
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
                                val minY = currentHeight - bounds.height
                                // Once opened, the window may be pulled past an edge to dock it there.
                                val overshoot = if (currentExpanded) maxOvershoot else 0f
                                x.snapTo(
                                    clamp(x.value + delta.x, currentWidth - bounds.width - overshoot, overshoot),
                                )
                                y.snapTo(clamp(y.value + delta.y, minY, max(-currentObstacle, minY)))
                            }
                        },
                        onEnd = {
                            scope.launch {
                                val leftEdge = currentWidth - currentContainer.width

                                when {
                                    currentExpanded && x.value > dockThreshold -> {
                                        restX = 0f
                                        dock = Dock(DockSide.Right, y.value)
                                    }

                                    currentExpanded && x.value < leftEdge - dockThreshold -> {
                                        restX = leftEdge
                                        dock = Dock(DockSide.Left, y.value)
                                    }

                                    else -> x.animateTo(if (x.value < leftEdge / 2) leftEdge else 0f, spring())
                                }
                            }
                        },
                    )
                    .shadow(10.dp, shape)
                    .background(Color.White, shape)
                    .clip(shape),
            ) {
                if (expanded) {
                    AvatarContent(
                        controller = controller,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .requiredSize(AvatarWidth, AvatarHeight),
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

                Row(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .requiredSize(LauncherSize)
                        .alpha((1f - progress.value / 0.4f).coerceIn(0f, 1f))
                        // Once opened this button sits over the page's end button, so it must not take touches at all.
                        .then(if (expanded) Modifier else Modifier.clickable { expanded = true }),
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

        dock?.let { current ->
            val right = current.side == DockSide.Right
            val avatarHeight = with(density) { AvatarHeight.toPx() }

            DockHandle(
                side = current.side,
                y = current.y,
                minY = avatarHeight - container.height,
                onYChange = { dock = Dock(current.side, it) },
                onTap = { dock = null },
                modifier = Modifier
                    .align(if (right) Alignment.BottomEnd else Alignment.BottomStart)
                    .offset {
                        IntOffset(
                            if (right) dockInsetRight.roundToInt() else -dockInsetLeft.roundToInt(),
                            (current.y - (avatarHeight - HandleHeight.toPx()) / 2).roundToInt(),
                        )
                    },
            )
        }
    }
}

/** Tab on the screen edge that brings a docked window back. It can be dragged along the edge to pick the return height. */
@Composable
private fun DockHandle(
    side: DockSide,
    y: Float,
    minY: Float,
    onYChange: (Float) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val right = side == DockSide.Right
    val shape = if (right) {
        RoundedCornerShape(topStart = HandleRadius, bottomStart = HandleRadius)
    } else {
        RoundedCornerShape(topEnd = HandleRadius, bottomEnd = HandleRadius)
    }
    val alpha = remember { Animatable(0f) }
    var dragDy by remember { mutableFloatStateOf(0f) }
    val latestY by rememberUpdatedState(y)
    val latestMinY by rememberUpdatedState(minY)
    val latestOnYChange by rememberUpdatedState(onYChange)

    fun clampDy(dy: Float) = clamp(dy, latestMinY - latestY, -latestY)

    fun commitDrag() {
        latestOnYChange(latestY + clampDy(dragDy))
        dragDy = 0f
    }

    LaunchedEffect(Unit) { alpha.animateTo(1f, tween(HandleFadeDuration)) }

    // One border width wider and nudged past the edge, so the border is only drawn on the inner sides.
    Column(
        modifier = modifier
            .offset {
                IntOffset(
                    if (right) HandleBorder.roundToPx() else -HandleBorder.roundToPx(),
                    dragDy.roundToInt(),
                )
            }
            .alpha(alpha.value)
            .size(HandleWidth + HandleBorder, HandleHeight)
            .shadow(8.dp, shape)
            .background(Color.White, shape)
            .border(HandleBorder, Brand, shape)
            .clip(shape)
            .pointerInput(Unit) {
                detectVerticalDragGestures(
                    onDragEnd = { commitDrag() },
                    onDragCancel = { commitDrag() },
                    onVerticalDrag = { change, amount ->
                        change.consume()
                        dragDy = clampDy(dragDy + amount)
                    },
                )
            }
            .clickable(onClick = onTap)
            .semantics { contentDescription = "Show assistant" },
        verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            painterResource(R.drawable.ic_chevron_down),
            contentDescription = null,
            modifier = Modifier.size(24.dp).rotate(if (right) 90f else -90f),
            tint = Brand,
        )
        Icon(
            painterResource(R.drawable.ic_sparkles),
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = Brand,
        )
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
 * Observes pointers before children (Initial pass) so the WebView still receives taps, and only
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
