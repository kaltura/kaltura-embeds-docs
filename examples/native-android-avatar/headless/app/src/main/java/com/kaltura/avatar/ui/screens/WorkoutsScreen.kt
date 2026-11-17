package com.kaltura.avatar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaltura.avatar.data.Intensity
import com.kaltura.avatar.data.workouts
import com.kaltura.avatar.ui.components.ScreenContainer
import com.kaltura.avatar.ui.theme.Hard
import com.kaltura.avatar.ui.theme.Ink
import com.kaltura.avatar.ui.theme.Light
import com.kaltura.avatar.ui.theme.Moderate
import com.kaltura.avatar.ui.theme.Muted

fun Intensity.color(): Color = when (this) {
    Intensity.LIGHT -> Light
    Intensity.MODERATE -> Moderate
    Intensity.HARD -> Hard
}

fun String.capitalized() = replaceFirstChar { it.uppercase() }

@Composable
fun WorkoutsScreen() {
    ScreenContainer("Workouts") {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            workouts.forEach { workout ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White, RoundedCornerShape(14.dp))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            workout.type,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink,
                        )
                        Text(
                            "${workout.date} · ${workout.minutes} min",
                            modifier = Modifier.padding(top = 4.dp),
                            fontSize = 13.sp,
                            color = Muted,
                        )
                    }
                    Text(
                        workout.intensity.id.capitalized(),
                        modifier = Modifier
                            .background(workout.intensity.color(), RoundedCornerShape(10.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }
            }
        }
    }
}
