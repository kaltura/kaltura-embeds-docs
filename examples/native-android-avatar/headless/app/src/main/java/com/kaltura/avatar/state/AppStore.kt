package com.kaltura.avatar.state

import androidx.annotation.DrawableRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.kaltura.avatar.R
import com.kaltura.avatar.data.Period
import com.kaltura.avatar.data.Plan
import com.kaltura.avatar.data.defaultPlan

enum class Tab(val id: String, val label: String, @param:DrawableRes val icon: Int) {
    HOME("home", "Home", R.drawable.ic_home),
    WORKOUTS("workouts", "Workouts", R.drawable.ic_fitness),
    PROGRESS("progress", "Progress", R.drawable.ic_progress),
    PLAN("plan", "Plan", R.drawable.ic_calendar);

    companion object {
        fun fromId(id: String) = entries.firstOrNull { it.id == id }
    }
}

object AppStore {
    var currentTab by mutableStateOf(Tab.HOME)
    var progressPeriod by mutableStateOf(Period.LAST_WEEK)
    var plan by mutableStateOf(defaultPlan)
}

class WorkoutPlanRequest(
    val plan: Plan,
    val suggested: Boolean,
    val onSave: ((saved: Plan, edited: Boolean) -> Unit)? = null,
    val onDismiss: ((reason: DismissReason) -> Unit)? = null,
)

enum class DismissReason { MEMBER, LIFECYCLE }

object WorkoutPlanBus {
    var request by mutableStateOf<WorkoutPlanRequest?>(null)
        private set

    fun open(next: WorkoutPlanRequest) {
        settle()
        request = next
    }

    fun settle(saved: Plan? = null, reason: DismissReason = DismissReason.MEMBER) {
        val current = request ?: return
        request = null

        if (saved != null) {
            AppStore.plan = saved
            current.onSave?.invoke(saved, saved != current.plan)
        } else {
            current.onDismiss?.invoke(reason)
        }
    }
}
