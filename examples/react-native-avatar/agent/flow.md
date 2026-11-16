# Flow: fitness training coach

A member of a training app talks to a coach avatar (floating WebView, same JSON bridge as in the [example README](../README.md)). The coach
reads the member's own training data, shows it on the app's screens, and proposes a new weekly plan in a **bottom sheet**
that the member can edit, then save or dismiss.

Status: draft. This is the agent side of the example: the screens and tool handlers are for the app, the agent files
are in this folder. The bridge contract in the [example README](../README.md) does not change; only the screens and the
three tool handlers are new.

## What this flow shows the agent can do

| Capability | Where in the flow |
| --- | --- |
| Read live app data and talk about it in plain numbers | `get_training_summary` (step 1) |
| Reason over the data and explain a cause, not just read numbers | Step 2: hard days back to back, no rest day, sessions missed |
| Drive the app's UI while it talks | `go_to` opens Progress and switches the period tab (steps 2, 5) |
| Know where the user is and what they see | Dynamic variables `currentScreen`, `progressPeriod` |
| Personalise from profile data | Dynamic variables `memberName`, `goal` |
| Fill a form for the user, user stays in control | `propose_workout_plan` bottom sheet, Save / Dismiss (steps 3, 4) |
| React to what the user actually did in the sheet | Result carries the final saved values and `edited` (step 4) |
| Recover when the user says no | `saved: false` branch (step 4b) |

## Screens (what the mobile dev builds)

Menu (hamburger, same as the current demo): **Workouts**, **Progress**, **Plan**. Screen titles are what the agent sees in
`currentScreen`.

| Screen | Content |
| --- | --- |
| **Workouts** | List of recent sessions: date, type (run, strength, ride, ...), duration, intensity (light / moderate / hard). |
| **Progress** | Period tabs `This week` / `Last week` / `Last 4 weeks`. Cards: workouts done of planned, active minutes, average intensity, rest days. Small bar chart of minutes per week (4 weeks tab). The agent can switch the tab. |
| **Plan** | The member's current weekly plan: days, time, intensity, "rest day after" on/off. `Edit plan` button opens the same bottom sheet empty-handed (manual path). Shows the plan the user saved last. |

### Bottom sheet: "Your new plan"

Opens **over the current screen** (no navigation) when the agent calls `propose_workout_plan`. Fields are pre-filled with
the agent's values and the member can change any of them:

| Field | Control | Values |
| --- | --- | --- |
| Days | Multi-select chips | Mon .. Sun |
| Time | Time picker | HH:MM, 24h |
| Intensity | Segmented control | light / moderate / hard |
| Duration | Stepper | 20 .. 90 min, step 5 |
| Rest day after hard sessions | Toggle | on / off |

A note at the top: "Suggested by your coach". Buttons: **Save** and **Dismiss** (swipe-down and tapping outside also dismiss).
While the sheet is open the tool call is pending; the app answers only on Save or Dismiss (see the contract below).
On Save the Plan screen shows the new plan. Ending the session or backgrounding the app while the sheet is open counts
as a dismiss.

## Client tools

The agent calls a tool, the WebView posts `toolCall {id, name, args}` to native, native
runs it and replies with `toolResult {id, result}`. All three tools have **Wait for response** on. Argument types in the
agent config are limited to `str`, `int` and `bool`, so lists are comma-separated strings.

### `get_training_summary`

| Arg | Type | Notes |
| --- | --- | --- |
| `period` | str, optional | `this_week` \| `last_week` \| `last_4_weeks` (default `last_week`) |

Result:

```json
{
  "ok": true,
  "period": "last_week",
  "workoutsDone": 3,
  "workoutsPlanned": 5,
  "activeMinutes": 128,
  "avgIntensity": "hard",
  "restDays": 1,
  "hardDaysInARow": 3,
  "minutesVsPreviousPct": -15,
  "weeklyMinutes": [190, 170, 150, 128]
}
```

`weeklyMinutes` (oldest first) is only returned for `last_4_weeks`. Unknown period: `{ "ok": false, "error": "unknown period \"x\"; use this_week, last_week or last_4_weeks" }`.

Mock data to hard-code in the app until there is a real backend:

| Field | `this_week` | `last_week` | `last_4_weeks` |
| --- | --- | --- | --- |
| workoutsDone / workoutsPlanned | 1 / 3 so far | 3 / 5 | 14 / 20 |
| activeMinutes | 38 | 128 | 638 |
| avgIntensity | moderate | hard | hard |
| restDays | 0 | 1 | 5 |
| hardDaysInARow (longest run) | 1 | 3 | 3 |
| minutesVsPreviousPct | -70 (partial week) | -15 | -33 (last week vs first week) |
| weeklyMinutes | n/a | n/a | 190, 170, 150, 128 |

The story the data tells: hard sessions back to back, little rest, then missed workouts and shrinking minutes.

### `go_to`

| Arg | Type | Notes |
| --- | --- | --- |
| `destination` | str, required | `workouts` \| `progress` \| `plan` |
| `period` | str, optional | Only with `progress`: `this_week` \| `last_week` \| `last_4_weeks` |

Result: `{ "ok": true, "destination": "progress", "period": "last_week" }`. Unknown destination or period: `ok: false`
with an `error`. Opens the screen and, for `progress`, selects the tab. If the user is already on Progress, the agent still
calls it to switch the tab.

### `propose_workout_plan`

| Arg | Type | Notes |
| --- | --- | --- |
| `days` | str, required | Comma-separated, lower case: `mon,wed,fri` |
| `time` | str, required | `HH:MM`, 24h, e.g. `18:00` |
| `intensity` | str, required | `light` \| `moderate` \| `hard` |
| `duration_min` | int, optional | Default 45 |
| `rest_day_after` | bool, optional | Default true |

Result when the user taps **Save** (values are the **final** ones, after any edits):

```json
{ "ok": true, "saved": true, "edited": true, "days": "mon,wed,sat", "time": "19:00", "intensity": "moderate", "duration_min": 45, "rest_day_after": true }
```

`edited` is true when the user changed anything the agent proposed. When the user dismisses, leaves, or the session ends:
`{ "ok": true, "saved": false }`. Invalid args (bad day name, malformed time): `{ "ok": false, "error": "..." }` and no
sheet opens. The server waits up to 120 s for the answer, so the WebView resolves with `{ ok: false, error: "native did not answer" }`
at 110 s (already how `avatar/avatar.js` behaves).

## Dynamic variables (native → agent)

Sent in `start` and re-sent in full on every screen or tab change (`updateDynamicVariables` replaces the whole set):

| Variable | Example |
| --- | --- |
| `memberName` | `Alex` |
| `goal` | `Run a 10K in 8 weeks` |
| `currentScreen` | `Progress` (the screen title) |
| `progressPeriod` | `last_week` (the tab shown on Progress) |

## Conversation script (happy path)

1. **Question.** *Member:* "I feel like I'm working hard but I'm not getting anywhere."
   Agent calls `get_training_summary` (`last_week`) and says it: 3 of 5 workouts done, 128 active minutes, down about 15% from the
   week before, three hard days in a row and only one rest day.
2. **Show + explain.** *Agent:* "Let me show you." Calls `go_to` (`progress`, `last_week`). Progress opens on Last week.
   The agent explains the cause: three hard sessions back to back, then it skipped the rest, which is why the later
   workouts got missed. It ties it to the goal: "for your 10K, that's the opposite of what helps."
3. **Propose.** *Member:* "So what should I do?" The agent suggests three moderate sessions a week with a rest day after, and calls
   `propose_workout_plan` (`mon,wed,fri`, `18:00`, `moderate`, 45, rest day on). The sheet opens over Progress.
   The agent says what it filled in and asks the member to check it.
4. **Confirm.** The member changes Friday to Saturday and taps Save. Result: `saved: true, edited: true, days "mon,wed,sat"`.
   The agent confirms the plan **as saved** ("Monday, Wednesday and Saturday at 6, moderate, with a rest day after") and
   does not repeat its own original proposal.
   - **4b. Dismiss.** If the member dismisses (`saved: false`), the agent does not say it is saved. It asks what felt wrong
     (days, time, intensity) and offers to propose again, or says they can build it on the Plan screen.
5. **Follow-up (tab switch).** *Member:* "And how did the last month look?" Agent calls `get_training_summary`
   (`last_4_weeks`), then `go_to` (`progress`, `last_4_weeks`) while it explains the downward trend, even though the member is
   already on Progress. Optional: "Want to see your new plan?" then `go_to` (`plan`).

## Ground rules for the agent (for the prompts we write)

- Numbers only from the tools. Never invent workout data.
- Always `get_training_summary` before talking about performance, and say the numbers aloud in plain language.
- Say "Let me show you." before `go_to`; only say a screen is open when the result has `ok: true`.
- Only say a plan is saved when the result has `saved: true`, and read back the values from the result, not from the proposal.
- No medical advice: no injury diagnosis, no calorie or supplement advice, suggest a professional for pain.
- Don't call the same tool twice in a row for one request.

## Agent files

| File | What it is |
| --- | --- |
| [`client-tools.json`](client-tools.json) | The three client tools: names, descriptions, arguments, **Wait for response**, timeouts |
| [`prompt-knowledge.md`](prompt-knowledge.md) | The `knowledge` prompt: persona, the flow, objections, verified information |
| [`prompt-app-tools.md`](prompt-app-tools.md) | The `appTools` prompt: when and how to use each tool, reading the dynamic variables |
| [`persona.md`](persona.md) | The agent's name, goal, target audience, restricted topics and opening phrase |

The app can be built without the agent: mock the three tool handlers with the data above.
