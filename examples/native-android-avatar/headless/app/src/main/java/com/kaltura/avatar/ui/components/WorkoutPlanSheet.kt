package com.kaltura.avatar.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaltura.avatar.data.DURATION_STEP
import com.kaltura.avatar.data.Day
import com.kaltura.avatar.data.Intensity
import com.kaltura.avatar.data.MAX_DURATION
import com.kaltura.avatar.data.MIN_DURATION
import com.kaltura.avatar.data.Plan
import com.kaltura.avatar.state.WorkoutPlanBus
import com.kaltura.avatar.state.WorkoutPlanRequest
import com.kaltura.avatar.ui.screens.capitalized
import com.kaltura.avatar.ui.theme.Brand
import com.kaltura.avatar.ui.theme.BrandTint
import com.kaltura.avatar.ui.theme.SheetFill
import com.kaltura.avatar.ui.theme.SheetHandle
import com.kaltura.avatar.ui.theme.SheetInk
import com.kaltura.avatar.ui.theme.SheetMuted

private val SheetShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)

private fun pad(value: Int) = value.toString().padStart(2, '0')

/**
 * Rendered in the same window as the app (not a dialog) so the avatar can stay on top of it.
 * [onVisibleHeightChange] reports how many pixels of the screen bottom the sheet covers.
 */
@Composable
fun BoxScope.WorkoutPlanSheet(onVisibleHeightChange: (Int) -> Unit) {
    val request = WorkoutPlanBus.request
    var displayed by remember { mutableStateOf<WorkoutPlanRequest?>(null) }
    var sheetHeight by remember { mutableIntStateOf(0) }

    LaunchedEffect(request) {
        if (request != null) displayed = request
    }

    val visible = request != null && displayed === request

    LaunchedEffect(visible, sheetHeight) {
        onVisibleHeightChange(if (visible) sheetHeight else 0)
    }

    BackHandler(enabled = visible) { WorkoutPlanBus.settle() }

    AnimatedVisibility(visible, enter = fadeIn(), exit = fadeOut()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f))
                .pointerInput(Unit) { detectTapGestures { WorkoutPlanBus.settle() } },
        )
    }

    AnimatedVisibility(
        visible = visible,
        modifier = Modifier.align(Alignment.BottomCenter),
        enter = slideInVertically { it },
        exit = slideOutVertically { it },
    ) {
        val shown = displayed ?: return@AnimatedVisibility

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .onSizeChanged { sheetHeight = it.height }
                .shadow(12.dp, SheetShape)
                .background(Color.White, SheetShape)
                .pointerInput(Unit) { detectTapGestures { } }
                .navigationBarsPadding()
                .padding(start = 20.dp, top = 12.dp, end = 20.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            key(shown) { PlanForm(shown) }
        }
    }
}

@Composable
private fun ColumnScope.PlanForm(request: WorkoutPlanRequest) {
    var selectedDays by remember { mutableStateOf(request.plan.days) }
    var time by remember { mutableStateOf(request.plan.time) }
    var intensity by remember { mutableStateOf(request.plan.intensity) }
    var durationMin by remember { mutableIntStateOf(request.plan.durationMin) }
    var restDayAfter by remember { mutableStateOf(request.plan.restDayAfter) }

    val (hour, minute) = time.split(":").map(String::toInt)
    val canSave = selectedDays.isNotEmpty()

    Box(
        modifier = Modifier
            .align(Alignment.CenterHorizontally)
            .size(width = 40.dp, height = 4.dp)
            .background(SheetHandle, RoundedCornerShape(2.dp)),
    )

    Column {
        Text("Your new plan", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SheetInk)
        if (request.suggested) {
            Text(
                "Suggested by your coach",
                modifier = Modifier.padding(top = 2.dp),
                fontSize = 13.sp,
                color = Brand,
            )
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FieldLabel("Days")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Day.entries.forEach { day ->
                val active = day in selectedDays

                Box(
                    modifier = Modifier
                        .size(width = 42.dp, height = 36.dp)
                        .background(if (active) Brand else SheetFill, RoundedCornerShape(18.dp))
                        .clickable {
                            selectedDays = Day.entries.filter { (it == day) != (it in selectedDays) }
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        day.label,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (active) Color.White else SheetMuted,
                    )
                }
            }
        }
    }

    FieldRow("Time") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Stepper(
                value = pad(hour),
                onDecrement = { time = "${pad((hour - 1 + 24) % 24)}:${pad(minute)}" },
                onIncrement = { time = "${pad((hour + 1) % 24)}:${pad(minute)}" },
            )
            Text(":", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SheetInk)
            Stepper(
                value = pad(minute),
                onDecrement = { time = "${pad(hour)}:${pad((minute - 5 + 60) % 60)}" },
                onIncrement = { time = "${pad(hour)}:${pad((minute + 5) % 60)}" },
            )
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FieldLabel("Intensity")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SheetFill, RoundedCornerShape(10.dp))
                .padding(3.dp),
        ) {
            Intensity.entries.forEach { item ->
                val active = item == intensity

                Text(
                    item.id.capitalized(),
                    modifier = Modifier
                        .weight(1f)
                        .background(if (active) Brand else Color.Transparent, RoundedCornerShape(8.dp))
                        .clickable { intensity = item }
                        .padding(vertical = 8.dp),
                    textAlign = TextAlign.Center,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (active) Color.White else SheetMuted,
                )
            }
        }
    }

    FieldRow("Duration") {
        Stepper(
            value = "$durationMin min",
            onDecrement = { durationMin = (durationMin - DURATION_STEP).coerceIn(MIN_DURATION, MAX_DURATION) },
            onIncrement = { durationMin = (durationMin + DURATION_STEP).coerceIn(MIN_DURATION, MAX_DURATION) },
        )
    }

    FieldRow("Rest day after hard sessions") {
        Switch(
            checked = restDayAfter,
            onCheckedChange = { restDayAfter = it },
            colors = SwitchDefaults.colors(checkedTrackColor = Brand),
        )
    }

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Dismiss",
            modifier = Modifier
                .weight(1f)
                .background(SheetFill, RoundedCornerShape(10.dp))
                .clickable { WorkoutPlanBus.settle() }
                .padding(vertical = 12.dp),
            textAlign = TextAlign.Center,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = SheetInk,
        )
        Text(
            "Save",
            modifier = Modifier
                .weight(1f)
                .alpha(if (canSave) 1f else 0.4f)
                .background(Brand, RoundedCornerShape(10.dp))
                .clickable(enabled = canSave) {
                    WorkoutPlanBus.settle(
                        Plan(selectedDays, time, intensity, durationMin, restDayAfter),
                    )
                }
                .padding(vertical = 12.dp),
            textAlign = TextAlign.Center,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
        )
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SheetMuted)
}

@Composable
private fun FieldRow(label: String, content: @Composable () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        FieldLabel(label)
        content()
    }
}

@Composable
private fun Stepper(value: String, onDecrement: () -> Unit, onIncrement: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        StepperButton("−", onDecrement)
        Text(
            value,
            modifier = Modifier.width(64.dp),
            textAlign = TextAlign.Center,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = SheetInk,
        )
        StepperButton("+", onIncrement)
    }
}

@Composable
private fun StepperButton(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .background(BrandTint, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Brand)
    }
}
