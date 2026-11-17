package com.kaltura.avatar.data

import org.json.JSONArray
import org.json.JSONObject

enum class Period(val id: String, val label: String) {
    THIS_WEEK("this_week", "This week"),
    LAST_WEEK("last_week", "Last week"),
    LAST_4_WEEKS("last_4_weeks", "Last 4 weeks");

    companion object {
        fun fromId(id: String) = entries.firstOrNull { it.id == id }
    }
}

enum class Day(val id: String, val label: String) {
    MON("mon", "Mon"),
    TUE("tue", "Tue"),
    WED("wed", "Wed"),
    THU("thu", "Thu"),
    FRI("fri", "Fri"),
    SAT("sat", "Sat"),
    SUN("sun", "Sun");

    companion object {
        fun fromId(id: String) = entries.firstOrNull { it.id == id }
    }
}

enum class Intensity(val id: String) {
    LIGHT("light"),
    MODERATE("moderate"),
    HARD("hard");

    companion object {
        fun fromId(id: String) = entries.firstOrNull { it.id == id }
    }
}

data class Plan(
    val days: List<Day>,
    val time: String,
    val intensity: Intensity,
    val durationMin: Int,
    val restDayAfter: Boolean,
)

data class TrainingSummary(
    val workoutsDone: Int,
    val workoutsPlanned: Int,
    val activeMinutes: Int,
    val avgIntensity: Intensity,
    val restDays: Int,
    val hardDaysInARow: Int,
    val minutesVsPreviousPct: Int,
    val weeklyMinutes: List<Int>? = null,
) {
    fun putInto(json: JSONObject): JSONObject = json
        .put("workoutsDone", workoutsDone)
        .put("workoutsPlanned", workoutsPlanned)
        .put("activeMinutes", activeMinutes)
        .put("avgIntensity", avgIntensity.id)
        .put("restDays", restDays)
        .put("hardDaysInARow", hardDaysInARow)
        .put("minutesVsPreviousPct", minutesVsPreviousPct)
        .also { if (weeklyMinutes != null) it.put("weeklyMinutes", JSONArray(weeklyMinutes)) }
}

data class Workout(
    val id: String,
    val date: String,
    val type: String,
    val minutes: Int,
    val intensity: Intensity,
)

val workouts = listOf(
    Workout("1", "Nov 16", "Run", 38, Intensity.MODERATE),
    Workout("2", "Nov 11", "Ride", 43, Intensity.HARD),
    Workout("3", "Nov 10", "Run", 40, Intensity.HARD),
    Workout("4", "Nov 9", "Strength", 45, Intensity.HARD),
    Workout("5", "Nov 5", "Run", 50, Intensity.MODERATE),
    Workout("6", "Nov 3", "Yoga", 30, Intensity.LIGHT),
)

val trainingSummary = mapOf(
    Period.THIS_WEEK to TrainingSummary(
        workoutsDone = 1,
        workoutsPlanned = 3,
        activeMinutes = 38,
        avgIntensity = Intensity.MODERATE,
        restDays = 0,
        hardDaysInARow = 1,
        minutesVsPreviousPct = -70,
    ),
    Period.LAST_WEEK to TrainingSummary(
        workoutsDone = 3,
        workoutsPlanned = 5,
        activeMinutes = 128,
        avgIntensity = Intensity.HARD,
        restDays = 1,
        hardDaysInARow = 3,
        minutesVsPreviousPct = -15,
    ),
    Period.LAST_4_WEEKS to TrainingSummary(
        workoutsDone = 14,
        workoutsPlanned = 20,
        activeMinutes = 638,
        avgIntensity = Intensity.HARD,
        restDays = 5,
        hardDaysInARow = 3,
        minutesVsPreviousPct = -33,
        weeklyMinutes = listOf(190, 170, 150, 128),
    ),
)

val defaultPlan = Plan(
    days = listOf(Day.MON, Day.TUE, Day.WED, Day.FRI, Day.SAT),
    time = "06:30",
    intensity = Intensity.HARD,
    durationMin = 45,
    restDayAfter = false,
)

object Member {
    const val NAME = "Alex"
    const val GOAL = "Run a 10K in 8 weeks"
}

const val MIN_DURATION = 20
const val MAX_DURATION = 90
const val DURATION_STEP = 5
const val DEFAULT_DURATION = 45
