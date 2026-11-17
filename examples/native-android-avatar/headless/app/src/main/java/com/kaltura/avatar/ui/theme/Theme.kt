package com.kaltura.avatar.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ColorScheme = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    background = ScreenBackground,
    surface = Color.White,
    onSurface = Ink,
)

@Composable
fun AvatarAndroidTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        typography = Typography,
        content = content
    )
}
