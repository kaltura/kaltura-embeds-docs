# Flow: fitness training coach

A member of a training app talks to a coach avatar (a WebView in the app, with the JSON bridge described in the
[bridge contract](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps-avatar-page#bridge-contract)). The coach reads the member's own training data, shows it on the app's screens, and proposes
a new weekly plan in a **bottom sheet** that the member can edit, then save or dismiss.

This is the scenario behind the avatar examples. The agent files are in this folder; the screens and tool handlers are in
the apps ([React Native](../react-native-avatar), [native Android](../native-android-avatar) and
[native iOS](../native-ios-avatar), each headless and contained).

## What this flow shows the agent can do

| Capability | Where in the flow |
| --- | --- |
| Read live app data and talk about it in plain numbers | `get_training_summary` (step 1) |
| Reason over the data and explain a cause, not just read numbers | Step 2: hard days back to back, no rest day, sessions missed |
| Drive the app's UI while it talks | `go_to` opens Progress and switches the period tab (steps 2, 5) |
| Know where the user is and what they see | Dynamic variables `currentScreen`, `progressPeriod` |
| Personalise from profile data | Dynamic variables `memberName`, `goal` |
| Fill a form for the user, user stays in control | `propose_workout_plan` bottom sheet, Save / Dismiss (steps 3, 4) |
| Keep talking while the user edits the form | `propose_workout_plan` does not wait; the agent explains what it filled in (step 3) |
| React to what the user actually did in the sheet | App event `plan_decided` triggers the agent; `get_plan_result` returns the final values and `edited` (step 4) |
| Recover when the user says no | `get_plan_result` returns `dismissed` (step 4b) |

## Screens (what the mobile dev builds)

A tab bar with **Home**, **Workouts**, **Progress** and **Plan**. Screen titles are what the agent sees in
`currentScreen`. Home lists what the member can ask the coach; the scenario uses the other three.

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
The tool call does not stay pending while the sheet is open: the app answers as soon as the sheet opens (see the tool
below). On Save the Plan screen shows the new plan. Backgrounding the app while the sheet is open closes it and counts as
a dismiss, without telling the agent.

## Client tools

The agent calls a tool, the page posts `{ type: "tool", tool: { id, name, args } }` to native, native runs it and
answers with `window.onToolResult({ id, data })`. `get_training_summary`, `go_to` and `get_plan_result` have **Wait for response** on;
`propose_workout_plan` has it **off**, so the agent is not blocked while the sheet is open (see that tool). Argument types in the
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
| `destination` | str, required | `home` \| `workouts` \| `progress` \| `plan` |
| `period` | str, optional | Only with `progress`: `this_week` \| `last_week` \| `last_4_weeks` |

Result: `{ "ok": true, "destination": "progress", "period": "last_week" }`. Unknown destination or period: `ok: false`
with an `error`. Opens the screen and, for `progress`, selects the tab. If the user is already on Progress, the agent still
calls it to switch the tab.

### `propose_workout_plan`

**Wait for response is off.** The agent keeps talking while the sheet is open, and does not get the member's decision as
a tool result. When the member decides, native sends a trigger text and the agent reads the decision with
`get_plan_result` (below).

| Arg | Type | Notes |
| --- | --- | --- |
| `days` | str, required | Comma-separated, lower case: `mon,wed,fri` |
| `time` | str, required | `HH:MM`, 24h, e.g. `18:00` |
| `intensity` | str, required | `light` \| `moderate` \| `hard` |
| `duration_min` | int, optional | Default 45 |
| `rest_day_after` | bool, optional | Default true |

Native opens the sheet and answers right away with `{ "ok": true, "opened": true }`. The agent does not read this result
(the tool does not wait). Invalid args (bad day name, malformed time): do not open the sheet; the agent does not see the
error either, so keep the args valid in the prompts.

### Trigger text: `[app event] plan_decided`

When the member saves or dismisses the sheet (Save, Dismiss, swipe down, tap outside), native calls
`window.onAgentText(text)` in the page, which sends the text to the agent with the `askViaText` runtime method
(`avatar.askViaText(text)`):

```
[app event] plan_decided
```

It carries **no data**. It only tells the agent the decision is in, so the agent calls `get_plan_result`. Send it once per
sheet and only while the session is connected. Send nothing when the session ends or the app is backgrounded. If a new
sheet replaces one that is still open, the old sheet's dismissal is not reported; only the latest sheet reports.

### `get_plan_result`

No arguments. **Wait for response is on.** The agent calls it right after the trigger text. Native answers with the
decision for the **latest** sheet the agent opened:

```json
{ "ok": true, "status": "saved", "edited": true, "days": "mon,wed,sat", "time": "19:00", "intensity": "moderate", "duration_min": 45, "rest_day_after": true }
```

Values are the **final** ones, after any edits. `edited` is true when the member changed anything the agent proposed.

| Situation | Result |
| --- | --- |
| Member tapped Save | `{ "ok": true, "status": "saved", ...final values, "edited": ... }` |
| Member dismissed the sheet | `{ "ok": true, "status": "dismissed" }` |
| Sheet still open, or no sheet opened yet | `{ "ok": true, "status": "open" }` |

## Dynamic variables (native → agent)

Written into the page when the session starts, and re-sent in full with `window.onScreenChanged(variables)` on every
screen or tab change (`updateDynamicVariables` replaces the whole set):

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
   `propose_workout_plan` (`mon,wed,fri`, `18:00`, `moderate`, 45, rest day on). The sheet opens over Progress and the tool
   returns at once. **The agent keeps talking while the sheet is open:** it says what it filled in and asks the member to
   check it and change whatever doesn't suit them. Then it waits.
4. **Confirm.** The member changes Friday to Saturday and taps Save. Native sends the text `[app event] plan_decided`.
   The agent calls `get_plan_result` and gets `status: saved, edited: true, days "mon,wed,sat"`.
   It confirms the plan **as saved** ("Monday, Wednesday and Saturday at 6, moderate, with a rest day after") and
   does not repeat its own original proposal.
   - **4b. Dismiss.** If the member dismisses, native sends the same trigger text and `get_plan_result` returns
     `status: dismissed`. The agent does not say it is saved. It asks what felt wrong (days, time, intensity) and offers
     to propose again, or says they can build it on the Plan screen.
5. **Follow-up (tab switch).** *Member:* "And how did the last month look?" Agent calls `get_training_summary`
   (`last_4_weeks`), then `go_to` (`progress`, `last_4_weeks`) while it explains the downward trend, even though the member is
   already on Progress. Optional: "Want to see your new plan?" then `go_to` (`plan`).

## Ground rules for the agent (for the prompts we write)

- Numbers only from the tools. Never invent workout data.
- Always `get_training_summary` before talking about performance, and say the numbers aloud in plain language.
- Say "Let me show you." before `go_to`; only say a screen is open when the result has `ok: true`.
- Only say a plan is saved when `get_plan_result` returned `saved`, and read back the values from that result, not from the proposal.
- `[app event]` messages come from the app, not from the member: act on them (for `plan_decided`, call `get_plan_result`), never read the tag aloud.
- No medical advice: no injury diagnosis, no calorie or supplement advice, suggest a professional for pain.
- Don't call the same tool twice in a row for one request.

## Agent files

| File | What it is |
| --- | --- |
| [`client-tools.json`](client-tools.json) | The four client tools: names, descriptions, arguments, **Wait for response**, timeouts |
| [`prompt-knowledge.md`](prompt-knowledge.md) | The `knowledge` prompt: persona, the flow, objections, verified information |
| [`prompt-app-tools.md`](prompt-app-tools.md) | The `appTools` prompt: when and how to use each tool, reading the dynamic variables |
| [`persona.md`](persona.md) | The agent's name, goal, target audience, restricted topics and opening phrase |

The app can be built without the agent: mock the four tool handlers with the data above.
