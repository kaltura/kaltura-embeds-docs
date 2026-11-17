package com.kaltura.avatar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaltura.avatar.data.Period
import com.kaltura.avatar.data.trainingSummary
import com.kaltura.avatar.state.AppStore
import com.kaltura.avatar.ui.components.ScreenContainer
import com.kaltura.avatar.ui.theme.Brand
import com.kaltura.avatar.ui.theme.Ink
import com.kaltura.avatar.ui.theme.Muted
import com.kaltura.avatar.ui.theme.SegmentBackground

private val ChartHeight = 120.dp

@Composable
fun ProgressScreen() {
    val period = AppStore.progressPeriod
    val summary = trainingSummary.getValue(period)

    val cards = listOf(
        "Workouts done" to "${summary.workoutsDone} of ${summary.workoutsPlanned}",
        "Active minutes" to summary.activeMinutes.toString(),
        "Avg intensity" to summary.avgIntensity.id.capitalized(),
        "Rest days" to summary.restDays.toString(),
    )

    ScreenContainer("Progress") {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .background(SegmentBackground, RoundedCornerShape(12.dp))
                .padding(3.dp),
        ) {
            Period.entries.forEach { item ->
                val active = item == period

                Text(
                    item.label,
                    modifier = Modifier
                        .weight(1f)
                        .background(
                            if (active) Color.White else Color.Transparent,
                            RoundedCornerShape(10.dp),
                        )
                        .clickable { AppStore.progressPeriod = item }
                        .padding(vertical = 8.dp),
                    textAlign = TextAlign.Center,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (active) Brand else Muted,
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            cards.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { (label, value) ->
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(Color.White, RoundedCornerShape(14.dp))
                                .padding(16.dp),
                        ) {
                            Text(
                                value,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Brand,
                            )
                            Text(
                                label,
                                modifier = Modifier.padding(top = 4.dp),
                                fontSize = 13.sp,
                                color = Muted,
                            )
                        }
                    }
                }
            }
        }

        summary.weeklyMinutes?.let { weeklyMinutes ->
            val maxMinutes = weeklyMinutes.max()

            Column(
                modifier = Modifier
                    .padding(top = 12.dp)
                    .fillMaxWidth()
                    .background(Color.White, RoundedCornerShape(14.dp))
                    .padding(16.dp),
            ) {
                Text(
                    "Minutes per week",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                        .height(ChartHeight + 44.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    weeklyMinutes.forEachIndexed { index, minutes ->
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                minutes.toString(),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Ink,
                            )
                            Box(
                                modifier = Modifier
                                    .padding(vertical = 6.dp)
                                    .width(32.dp)
                                    .height(ChartHeight * (minutes.toFloat() / maxMinutes))
                                    .background(Brand, RoundedCornerShape(6.dp)),
                            )
                            Text("Week ${index + 1}", fontSize = 12.sp, color = Muted)
                        }
                    }
                }
            }
        }
    }
}
