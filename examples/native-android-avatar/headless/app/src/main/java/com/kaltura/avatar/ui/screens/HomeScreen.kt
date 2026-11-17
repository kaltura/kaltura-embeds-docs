package com.kaltura.avatar.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.core.animateFloatAsState
import com.kaltura.avatar.R
import com.kaltura.avatar.ui.components.ScreenContainer
import com.kaltura.avatar.ui.theme.Brand
import com.kaltura.avatar.ui.theme.BrandTint
import com.kaltura.avatar.ui.theme.Ink
import com.kaltura.avatar.ui.theme.Muted

// One duration for the size change, the text fade and the chevron, so the card and its text finish together.
private const val AccordionDuration = 220

private val InfoInk = Color(0xFF3A3A3C)
private val BodyInk = Color(0xFF6C6C70)
private val ExampleBorder = Color(0xFFC7C7CC)

private class Capability(
    val id: String,
    val title: String,
    val description: String,
    @DrawableRes val icon: Int,
    val example: String? = null,
)

private val capabilities = listOf(
    Capability(
        id = "talk",
        title = "Talk to the agent",
        description = "Speak naturally. The agent listens, answers by voice, and stays on screen while you use the app.",
        icon = R.drawable.ic_mic,
        example = "\"Hi, what can you help me with?\"",
    ),
    Capability(
        id = "summary",
        title = "Ask about your workouts",
        description = "The agent reads your training summary for this week, last week or the last 4 weeks and answers with your numbers.",
        icon = R.drawable.ic_search_list,
        example = "\"How did last week go?\"",
    ),
    Capability(
        id = "navigate",
        title = "Navigate the app",
        description = "Ask the agent to open Home, Workouts, Progress or Plan, and to pick the period shown on Progress.",
        icon = R.drawable.ic_swap,
        example = "\"Show me my progress for the last 4 weeks.\"",
    ),
    Capability(
        id = "plan",
        title = "Plan your week",
        description = "The agent proposes a plan and opens it in a bottom sheet. Edit it, save or dismiss, and the agent reacts to what you chose.",
        icon = R.drawable.ic_calendar,
        example = "\"Plan my next week, I want to run in the mornings.\"",
    ),
    Capability(
        id = "avatar",
        title = "Move the avatar aside",
        description = "Drag the avatar anywhere so it never covers what you are reading. Tap the cross to end the session.",
        icon = R.drawable.ic_move,
    ),
)

@Composable
fun HomeScreen() {
    var openId by rememberSaveable { mutableStateOf<String?>(capabilities.first().id) }

    ScreenContainer("Try Kaltura Agent") {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(16.dp))
                .padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                painterResource(R.drawable.ic_info),
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = Brand,
            )
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Ink)) {
                        append("Demo app.")
                    }
                    append(" This app shows how to embed Kaltura Agent in a native app. The workout data is sample content.")
                },
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp),
                fontSize = 15.sp,
                lineHeight = 22.sp,
                color = InfoInk,
            )
        }

        Text(
            "What you can do in this MVP",
            modifier = Modifier.padding(top = 24.dp, bottom = 12.dp),
            fontSize = 15.sp,
            color = Muted,
        )

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            capabilities.forEach { capability ->
                CapabilityCard(
                    capability = capability,
                    open = capability.id == openId,
                    onClick = { openId = if (openId == capability.id) null else capability.id },
                )
            }
        }
    }
}

@Composable
private fun CapabilityCard(capability: Capability, open: Boolean, onClick: () -> Unit) {
    val rotation by animateFloatAsState(
        targetValue = if (open) 180f else 0f,
        animationSpec = tween(AccordionDuration, easing = FastOutSlowInEasing),
        label = "chevron",
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White, RoundedCornerShape(16.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(BrandTint, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(capability.icon),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Brand,
                )
            }
            Text(
                capability.title,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 14.dp),
                fontSize = 17.sp,
                fontWeight = FontWeight.Medium,
                color = Ink,
            )
            Icon(
                painterResource(R.drawable.ic_chevron_down),
                contentDescription = if (open) "Collapse" else "Expand",
                modifier = Modifier
                    .size(24.dp)
                    .rotate(rotation),
                tint = Muted,
            )
        }

        AnimatedVisibility(
            visible = open,
            enter = expandVertically(tween(AccordionDuration, easing = FastOutSlowInEasing)) +
                fadeIn(tween(AccordionDuration)),
            exit = shrinkVertically(tween(AccordionDuration, easing = FastOutSlowInEasing)) +
                fadeOut(tween(AccordionDuration)),
        ) {
            Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                Text(
                    capability.description,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                    color = BodyInk,
                )
                capability.example?.let { example ->
                    Text(
                        example,
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .fillMaxWidth()
                            .border(0.5.dp, ExampleBorder, RoundedCornerShape(14.dp))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                        color = Ink,
                    )
                }
            }
        }
    }
}
