package com.kaltura.avatar

import com.kaltura.avatar.data.DEFAULT_DURATION
import com.kaltura.avatar.data.DURATION_STEP
import com.kaltura.avatar.data.Day
import com.kaltura.avatar.data.Intensity
import com.kaltura.avatar.data.MAX_DURATION
import com.kaltura.avatar.data.MIN_DURATION
import com.kaltura.avatar.data.Period
import com.kaltura.avatar.data.Plan
import com.kaltura.avatar.data.trainingSummary
import com.kaltura.avatar.state.AppStore
import com.kaltura.avatar.state.DismissReason
import com.kaltura.avatar.state.Tab
import com.kaltura.avatar.state.WorkoutPlanBus
import com.kaltura.avatar.state.WorkoutPlanRequest
import org.json.JSONObject
import kotlin.math.roundToInt

private val TIME_PATTERN = Regex("^([01]\\d|2[0-3]):[0-5]\\d$")

private fun JSONObject.optStringOrNull(name: String): String? =
    if (has(name) && !isNull(name)) optString(name) else null

private fun ok(vararg fields: Pair<String, Any?>) =
    JSONObject().put("ok", true).also { json -> fields.forEach { (k, v) -> json.put(k, v) } }

private fun failure(message: String) = JSONObject().put("ok", false).put("error", message)

private fun periodError(period: String) =
    "unknown period \"$period\"; use ${Period.entries.joinToString(", ") { it.id }}"

private sealed interface ParsedPlan {
    data class Valid(val plan: Plan) : ParsedPlan
    data class Invalid(val error: String) : ParsedPlan
}

private fun parseProposedPlan(args: JSONObject): ParsedPlan {
    val rawDays = args.optStringOrNull("days").orEmpty()
    val requested = rawDays.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
    val invalidDay = requested.firstOrNull { Day.fromId(it) == null }

    if (requested.isEmpty() || invalidDay != null) {
        return ParsedPlan.Invalid(
            "invalid day \"${invalidDay ?: rawDays}\"; use ${Day.entries.joinToString(",") { it.id }}",
        )
    }

    val time = args.optStringOrNull("time").orEmpty()
    if (!TIME_PATTERN.matches(time)) {
        return ParsedPlan.Invalid("invalid time \"$time\"; use HH:MM, 24h")
    }

    val rawIntensity = args.optStringOrNull("intensity").orEmpty()
    val intensity = Intensity.fromId(rawIntensity)
        ?: return ParsedPlan.Invalid(
            "invalid intensity \"$rawIntensity\"; use ${Intensity.entries.joinToString(", ") { it.id }}",
        )

    val duration = (if (args.has("duration_min") && !args.isNull("duration_min")) {
        args.optDouble("duration_min", DEFAULT_DURATION.toDouble())
    } else {
        DEFAULT_DURATION.toDouble()
    }).coerceIn(MIN_DURATION.toDouble(), MAX_DURATION.toDouble())

    return ParsedPlan.Valid(
        Plan(
            days = Day.entries.filter { it.id in requested },
            time = time,
            intensity = intensity,
            durationMin = (duration / DURATION_STEP).roundToInt() * DURATION_STEP,
            restDayAfter = if (args.has("rest_day_after") && !args.isNull("rest_day_after")) {
                args.optBoolean("rest_day_after", true)
            } else {
                true
            },
        ),
    )
}

// propose_workout_plan does not wait for the member (Wait for response is off), so the agent keeps talking while the
// sheet is open. When the member saves or dismisses, the app only sends this trigger text; the agent then calls
// get_plan_result to read the decision.
const val PLAN_DECIDED_EVENT = "[app event] plan_decided"

private fun savedDecision(plan: Plan, edited: Boolean): Map<String, Any?> = mapOf(
    "status" to "saved",
    "days" to plan.days.joinToString(",") { it.id },
    "time" to plan.time,
    "intensity" to plan.intensity.id,
    "duration_min" to plan.durationMin,
    "rest_day_after" to plan.restDayAfter,
    "edited" to edited,
)

class NativeTools(private val tellAgent: (String) -> Unit) {
    // What the member did with the last plan sheet the agent opened; read by get_plan_result.
    private var planDecision: Map<String, Any?> = mapOf("status" to "open")
    private var latestProposal = 0

    /** [respond] receives the full `{ id, data }` / `{ id, error }` envelope for `window.onToolResult`. */
    fun call(id: Int, name: String, args: JSONObject, respond: (JSONObject) -> Unit) {
        fun data(payload: JSONObject) = respond(JSONObject().put("id", id).put("data", payload))

        when (name) {
            "get_training_summary" -> {
                val rawPeriod = args.optStringOrNull("period") ?: Period.LAST_WEEK.id
                val period = Period.fromId(rawPeriod)

                if (period == null) {
                    data(failure(periodError(rawPeriod)))
                    return
                }

                data(trainingSummary.getValue(period).putInto(ok("period" to period.id)))
            }

            "go_to" -> {
                val destination = args.optStringOrNull("destination").orEmpty()
                val rawPeriod = args.optStringOrNull("period")
                val tab = Tab.fromId(destination)

                if (tab == null) {
                    data(
                        failure(
                            "unknown destination \"$destination\"; use ${Tab.entries.joinToString(", ") { it.id }}",
                        ),
                    )
                    return
                }

                if (tab == Tab.PROGRESS && rawPeriod != null) {
                    val period = Period.fromId(rawPeriod)

                    if (period == null) {
                        data(failure(periodError(rawPeriod)))
                        return
                    }

                    AppStore.progressPeriod = period
                }

                AppStore.currentTab = tab

                data(
                    ok("destination" to tab.id).also {
                        if (tab == Tab.PROGRESS) it.put("period", AppStore.progressPeriod.id)
                    },
                )
            }

            "propose_workout_plan" -> {
                when (val parsed = parseProposedPlan(args)) {
                    is ParsedPlan.Invalid -> data(failure(parsed.error))
                    is ParsedPlan.Valid -> {
                        // Opening a sheet settles the previous one (its onDismiss runs). Only the latest proposal may report a decision.
                        val proposalId = ++latestProposal

                        fun decide(decision: Map<String, Any?>, notify: Boolean = true) {
                            if (proposalId != latestProposal) return

                            planDecision = decision

                            if (notify) tellAgent(PLAN_DECIDED_EVENT)
                        }

                        planDecision = mapOf("status" to "open")

                        WorkoutPlanBus.open(
                            WorkoutPlanRequest(
                                plan = parsed.plan,
                                suggested = true,
                                onSave = { saved, edited -> decide(savedDecision(saved, edited)) },
                                // Backgrounding closes the sheet but is not a member decision: record it, do not wake the agent.
                                onDismiss = { reason ->
                                    decide(mapOf("status" to "dismissed"), notify = reason == DismissReason.MEMBER)
                                },
                            ),
                        )

                        // The tool does not wait for the member: answer as soon as the sheet is open so the agent can keep talking.
                        data(ok("opened" to true))
                    }
                }
            }

            "get_plan_result" -> data(ok(*planDecision.toList().toTypedArray()))

            else -> respond(JSONObject().put("id", id).put("error", "Unknown native tool: $name"))
        }
    }
}
