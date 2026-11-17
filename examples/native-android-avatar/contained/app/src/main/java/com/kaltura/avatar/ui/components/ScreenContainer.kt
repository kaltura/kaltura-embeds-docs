package com.kaltura.avatar.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaltura.avatar.ui.theme.Ink
import com.kaltura.avatar.ui.theme.ScreenBackground

@Composable
fun ScreenContainer(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBackground)
            .verticalScroll(rememberScrollState())
            .padding(PaddingValues(start = 20.dp, top = 20.dp, end = 20.dp, bottom = 96.dp)),
    ) {
        Text(
            text = title,
            modifier = Modifier.padding(bottom = 16.dp),
            fontSize = 28.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Ink,
        )
        content()
    }
}
