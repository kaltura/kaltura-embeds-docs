package com.kaltura.avatar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.PreviewScreenSizes
import com.kaltura.avatar.state.AppStore
import com.kaltura.avatar.state.DismissReason
import com.kaltura.avatar.state.Tab
import com.kaltura.avatar.state.WorkoutPlanBus
import com.kaltura.avatar.ui.components.WorkoutPlanSheet
import com.kaltura.avatar.ui.screens.HomeScreen
import com.kaltura.avatar.ui.screens.PlanScreen
import com.kaltura.avatar.ui.screens.ProgressScreen
import com.kaltura.avatar.ui.screens.WorkoutsScreen
import com.kaltura.avatar.ui.theme.AvatarAndroidTheme
import com.kaltura.avatar.ui.theme.Brand
import com.kaltura.avatar.ui.theme.BrandTint
import com.kaltura.avatar.ui.theme.Muted
import com.kaltura.avatar.ui.theme.ScreenBackground

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AvatarAndroidTheme {
                AvatarAndroidApp()
            }
        }
    }

    override fun onStop() {
        super.onStop()
        WorkoutPlanBus.settle(reason = DismissReason.LIFECYCLE)
    }
}

@PreviewScreenSizes
@Composable
fun AvatarAndroidApp() {
    var tabBarHeight by remember { mutableIntStateOf(0) }
    var sheetVisibleHeight by remember { mutableIntStateOf(0) }

    Box(modifier = Modifier.fillMaxSize().background(ScreenBackground)) {
        Scaffold(
            containerColor = ScreenBackground,
            bottomBar = {
                NavigationBar(
                    modifier = Modifier.onSizeChanged { tabBarHeight = it.height },
                    containerColor = Color.White,
                ) {
                    Tab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = tab == AppStore.currentTab,
                            onClick = { AppStore.currentTab = tab },
                            icon = { Icon(painterResource(tab.icon), contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Brand,
                                selectedTextColor = Brand,
                                unselectedIconColor = Muted,
                                unselectedTextColor = Muted,
                                indicatorColor = BrandTint,
                            ),
                        )
                    }
                }
            },
        ) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding)) {
                when (AppStore.currentTab) {
                    Tab.HOME -> HomeScreen()
                    Tab.WORKOUTS -> WorkoutsScreen()
                    Tab.PROGRESS -> ProgressScreen()
                    Tab.PLAN -> PlanScreen()
                }
            }
        }

        WorkoutPlanSheet(onVisibleHeightChange = { sheetVisibleHeight = it })

        if (tabBarHeight > 0) {
            Avatar(tabBarHeight = tabBarHeight, sheetVisibleHeight = sheetVisibleHeight)
        }
    }
}
