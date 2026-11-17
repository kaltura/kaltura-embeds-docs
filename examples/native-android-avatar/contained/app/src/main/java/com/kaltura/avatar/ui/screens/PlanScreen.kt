package com.kaltura.avatar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaltura.avatar.data.Day
import com.kaltura.avatar.state.AppStore
import com.kaltura.avatar.state.WorkoutPlanBus
import com.kaltura.avatar.state.WorkoutPlanRequest
import com.kaltura.avatar.ui.components.ScreenContainer
import com.kaltura.avatar.ui.theme.Brand
import com.kaltura.avatar.ui.theme.Chip
import com.kaltura.avatar.ui.theme.Divider
import com.kaltura.avatar.ui.theme.Ink
import com.kaltura.avatar.ui.theme.Muted

@Composable
fun PlanScreen() {
    val plan = AppStore.plan

    val details = listOf(
        "Time" to plan.time,
        "Intensity" to plan.intensity.id.capitalized(),
        "Duration" to "${plan.durationMin} min",
        "Rest day after" to if (plan.restDayAfter) "On" else "Off",
    )

    ScreenContainer("Plan") {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(14.dp))
                .padding(16.dp),
        ) {
            Text(
                "Your weekly plan",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Ink,
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Day.entries.forEach { day ->
                    val active = day in plan.days

                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(if (active) Brand else Chip, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            day.label,
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (active) Color.White else Muted,
                        )
                    }
                }
            }
            details.forEach { (label, value) ->
                HorizontalDivider(thickness = 0.5.dp, color = Divider)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(label, fontSize = 15.sp, color = Muted)
                    Text(
                        value,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Ink,
                    )
                }
            }
        }
        Text(
            "Edit plan",
            modifier = Modifier
                .padding(top = 16.dp)
                .fillMaxWidth()
                .background(Brand, RoundedCornerShape(14.dp))
                .clickable {
                    WorkoutPlanBus.open(WorkoutPlanRequest(plan = plan, suggested = false))
                }
                .padding(vertical = 14.dp),
            textAlign = TextAlign.Center,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
    }
}
