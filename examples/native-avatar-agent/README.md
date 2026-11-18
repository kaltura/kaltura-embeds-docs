# Set up the agent for this example

This folder holds everything the avatar examples' agent needs: client tools, prompts, persona and opening phrase. The React Native, native Android and native iOS apps, headless and contained, all talk to this one agent. You apply them by letting an AI assistant create a new agent for you with the Kaltura APIs, using your partner ID and admin secret. This page is written for two readers:

- **You**: follow [For you](#for-you-let-an-ai-assistant-do-it) to prepare your credentials and send the prompt.
- **An AI agent** that was asked to do the setup: follow [the instructions for the agent](#instructions-for-the-ai-agent).

## What gets configured

| File | Goes to |
| --- | --- |
| [`client-tools.json`](client-tools.json) | Four client tools: `get_training_summary`, `go_to`, `propose_workout_plan`, `get_plan_result` |
| [`prompt-knowledge.md`](prompt-knowledge.md) | The agent's `knowledge` prompt |
| [`prompt-app-tools.md`](prompt-app-tools.md) | The agent's `appTools` prompt |
| [`persona.md`](persona.md) | The `name`, `goal`, `targetAudience` and `restrictedTopics` prompts, and the opening phrase |
| [`flow.md`](flow.md) | Background only: the scenario the agent follows. Nothing in it is applied |

The setup creates a **new** agent on your partner, with its own intellect, avatar and widget. It does not touch your other agents.

## For you: let an AI assistant do it

You need two values from your Kaltura partner: the **partner ID** and the **admin secret**. Treat the admin secret like a password.

**Get them from the Kaltura Management Console (KMC):**

1. Sign in to the KMC with an administrator account of your partner: [kmc.kaltura.com](https://kmc.kaltura.com) for the US production region. On another region or environment, use the KMC address your Kaltura contact gave you, and set `REGION` in `.env` to that region.
2. Open **Settings**, then **Integration Settings**.
3. Copy the **Partner ID** and the **Administrator Secret** (not the User Secret). Keep them for the `.env` file in step 2 below.

Do not paste the admin secret into the chat: everything you type there becomes part of the conversation transcript. Put it in a local `.env` file instead. The file is git-ignored, so it is never committed, and the assistant reads it from the shell without printing it.

1. Open your coding assistant in this repo (it needs to read files and run shell commands).
2. Create the `.env` file and fill in `PARTNER_ID` and `ADMIN_SECRET`. Leave `REGION=nvp1` for the US production region; otherwise set the region of your partner:

   ```bash
   cd examples/native-avatar-agent
   cp .env.example .env
   ```

3. Send the assistant this prompt:

   > Create a Kaltura agent for the avatar examples. Follow `examples/native-avatar-agent/README.md`, section "Instructions for the AI agent".
   > - My credentials are in `examples/native-avatar-agent/.env`. Do not open, print or copy that file or the admin secret. Load it in the shell only.
   > - First show me what you would create and change, and wait for my OK before you write anything.

4. When the assistant is done, it tells you the new agent's ID and widget ID. Put the widget ID in `WIDGET_ID`, and your partner ID in `PARTNER_ID`, in the `.env` file of the app you want to run, then follow that app's README. The apps are listed in the [repository README](../../README.md#examples).

An assistant that cannot make HTTP requests or run shell commands cannot do the setup.

## Instructions for the AI agent

You are setting up a Kaltura conversational agent for the avatar examples in this repository (`react-native-avatar`, `native-android-avatar` and `native-ios-avatar`). Work from the files in this folder. Do exactly what is listed here and nothing else.

### Rules

1. **Never print, log or store the admin secret, the KS or any other secret.** The credentials are in `examples/native-avatar-agent/.env`. Do not read that file with a file-reading tool, `cat`, `grep` or similar, and do not run `env`, `printenv`, `set -x` or `echo` on the variables. Load the file in the shell (`set -a; . ./.env; set +a`) and use the variables only inside the commands you run. Their values must never appear in your commands, your output or your messages. Do not save them to any file.
2. **Show the plan first.** Before you create or change anything, tell the user what you will create and change (see [Report](#report)) and wait for a clear yes.
3. **Create one agent and touch nothing else.** Step 1 creates one agent with its own intellect, avatar and widget. Never rename or delete existing agents, intellects, avatars, tools or prompts.
4. **Be idempotent.** Look tools up by name, so running the setup twice gives the same result and no duplicate tools. If the user gives you the ID of the agent a previous run created, do not create another one: find its intellect and widget as described in [step 1](#step-1-create-the-agent-then-read-it) and continue from there.
5. If a request fails, stop, show the HTTP status and the response body (without any secret) and ask the user. Do not retry blindly or guess other endpoints.

### Inputs

From `.env` (load it in the shell, do not read it):

| Variable | Use |
| --- | --- |
| `PARTNER_ID` | The partner that owns the agent |
| `ADMIN_SECRET` | To mint an admin KS (Kaltura session) |
| `REGION` | The region of the partner, for example `nvp1` (US production, the template default). It sets the hosts below |
| `KALTURA_API_URL` | Optional override of the Kaltura API host |
| `AGENTIC_API_URL` | Optional override of the Agentic API host. Required when `REGION` is not `nvp1` |

Hosts, from `REGION`:

| Name | Host | Used for |
| --- | --- | --- |
| Kaltura API | `https://www.kaltura.com/api_v3` for `nvp1`, otherwise `https://api.$REGION.ovp.kaltura.com/api_v3`, unless `KALTURA_API_URL` is set | Minting the KS |
| Agentic API (call it `AGENTIC`) | `https://api.avatar.us.kaltura.ai` for US partners (`nvp1`), `https://api.avatar.eu.kaltura.ai` for EU partners, unless `AGENTIC_API_URL` is set | Creating the agent, its avatar and its widget (step 1) |
| Genie API (call it `GENIE`) | `https://genie.$REGION.ovp.kaltura.com` | Reading and updating the intellect and its tools (steps 1 to 5) |

If `PARTNER_ID` or `ADMIN_SECRET` is empty, stop and ask the user to fill it in `.env`. If `REGION` is empty, use `nvp1`. The partner's region is the one the KMC runs in (see [For you](#for-you-let-an-ai-assistant-do-it)). If `REGION` is not `nvp1` and `AGENTIC_API_URL` is empty, stop and ask the user whether their partner is in the US or the EU, and to set `AGENTIC_API_URL` in `.env` to the matching host above. If a call to these hosts fails with a connection error, stop and ask the user to correct `REGION`, `KALTURA_API_URL` or `AGENTIC_API_URL`.

### Step 0: get an admin KS

Every Genie call needs a KS. Mint an admin KS with the `disableentitlement` privilege from the admin secret, in the same shell command as the call that uses it (each command starts with a clean shell, so load `.env` and mint the KS again each time, or put both in a small helper script outside the repo):

```bash
set -a; . ./.env; set +a
REGION=${REGION:-nvp1}
if [ "$REGION" = nvp1 ]; then API=https://www.kaltura.com/api_v3; else API=https://api.$REGION.ovp.kaltura.com/api_v3; fi
KS=$(curl -s "${KALTURA_API_URL:-$API}/service/session/action/start" \
  -d format=1 -d partnerId="$PARTNER_ID" -d secret="$ADMIN_SECRET" \
  -d type=2 -d expiry=3600 -d privileges=disableentitlement | tr -d '"')
```

The result is the KS as a plain string. If it starts with `{`, it is an error object: show its `message` and stop. Never print the KS.

All Genie calls are `POST` with JSON bodies and the headers `Content-Type: application/json` and `Authorization: KS $KS`. `GENIE` is `https://genie.$REGION.ovp.kaltura.com`.

All Agentic API calls are `POST` with JSON bodies and the headers `Content-Type: application/json` and `Authorization: Bearer $KS`. An application error comes back as HTTP 200 with a body whose `objectType` is `KalturaAPIException`: treat it as a failed request.

### Step 1: create the agent, then read it

<!-- Adapted from the Agentic API quick start, "From one sentence" (docs.kaltura.com/docs/api-references/agentic-api/quick-start#from-one-sentence). Replace with a link once that page is published. -->

The agent is created from one sentence:

> A friendly personal training coach named Sam inside a fitness app, who reads the member's training data, explains why their progress stalled and proposes a weekly plan.

Steps 2 to 4 then replace its tools, prompts and opening phrase with the ones in this folder, so the sentence only has to get the agent created.

The script below makes these calls, in order, on `AGENTIC`:

1. `/v1/application/generateAgentProfile` turns the sentence into a name, goal, target audience, restricted topics and opening phrase. It saves nothing.
2. `/v1/intellect/add` stores that profile as the agent's intellect (its behavior): a base directive, three prompts and the opening phrase. It returns the intellect `id`, an integer.
3. `/v1/catalog-item/list` picks the first preset voice and the first preset visual.
4. `/v1/avatar/create` creates the avatar from that voice and visual. It returns the avatar `id`.
5. `/v1/agent/create` ties the intellect and the avatar together. It returns the `agentId`, a UUID.
6. `/v1/application/resolveWidgetId` returns the agent's `widgetId`, creating the widget on first use. The apps need this value.

Save it as `create-agent.sh` in a scratch directory **outside the repo**, then run it from `examples/native-avatar-agent` (where `.env` is) with `bash <path>/create-agent.sh`. It needs `curl` and `jq`, loads `.env` itself and never prints the admin secret or the KS.

```bash
#!/usr/bin/env bash
# Creates the agent for the avatar examples from one sentence, with Agentic API REST calls.
# Run it from examples/native-avatar-agent. Prints only the IDs it creates.
set -euo pipefail
set -a; . ./.env; set +a
: "${PARTNER_ID:?fill PARTNER_ID in .env}" "${ADMIN_SECRET:?fill ADMIN_SECRET in .env}"

REGION=${REGION:-nvp1}
if [ "$REGION" = nvp1 ]; then API=https://www.kaltura.com/api_v3; else API=https://api.$REGION.ovp.kaltura.com/api_v3; fi
API=${KALTURA_API_URL:-$API}
if [ -z "${AGENTIC_API_URL:-}" ]; then
  if [ "$REGION" = nvp1 ]; then AGENTIC_API_URL=https://api.avatar.us.kaltura.ai
  else echo "Set AGENTIC_API_URL in .env (US: https://api.avatar.us.kaltura.ai, EU: https://api.avatar.eu.kaltura.ai)" >&2; exit 1; fi
fi

BRIEF="A friendly personal training coach named Sam inside a fitness app, who reads the member's training data, explains why their progress stalled and proposes a weekly plan."

# Every call is a JSON POST with the admin KS. Exits on HTTP errors and on
# application errors, which come back as HTTP 200 with a KalturaAPIException body.
call() {
  local out
  if ! out=$(curl -sS --fail-with-body -X POST "$AGENTIC_API_URL$1" \
    -H "Authorization: Bearer $KS" -H "Content-Type: application/json" -d "$2"); then
    echo "$1 failed: $out" >&2; exit 1
  fi
  if jq -e '.objectType? == "KalturaAPIException"' <<<"$out" >/dev/null; then
    echo "$1 failed: $(jq -r .message <<<"$out")" >&2; exit 1
  fi
  echo "$out"
}

echo "[1/7] Minting an admin KS"
KS_RESPONSE=$(curl -sS -X POST "$API/service/session/action/start" \
  -d format=1 -d partnerId="$PARTNER_ID" -d secret="$ADMIN_SECRET" \
  -d type=2 -d expiry=3600 -d privileges=disableentitlement)
KS=$(jq -r 'if type == "string" then . else empty end' <<<"$KS_RESPONSE")
if [ -z "$KS" ]; then
  echo "session.start failed: $(jq -r '.message? // "unexpected response"' <<<"$KS_RESPONSE")" >&2; exit 1
fi

echo "[2/7] Writing a profile from the sentence"
PROFILE=$(call /v1/application/generateAgentProfile "$(jq -n --arg d "$BRIEF" '{userDescription: $d}')")
NAME=$(jq -r '.name // "Sam"' <<<"$PROFILE")

echo "[3/7] Creating the intellect for \"$NAME\""
INTELLECT_ID=$(call /v1/intellect/add "$(jq -n --argjson p "$PROFILE" --arg n "$NAME" '{
  type: "internal", status: 2, name: $n,
  base_directive: "You are \($n). Be concise, friendly and helpful.",
  opening_phrase: ($p.openingPhrase // "Hi! How can I help you today?"),
  prompts: [
    {key: "goal",             label: "Goal",              type: "custom", headerTemplate: "Your core goal:", value: ($p.goal // "")},
    {key: "targetAudience",   label: "Target audience",   type: "custom", headerTemplate: "Your audience:",  value: ($p.targetAudience // "")},
    {key: "restrictedTopics", label: "Restricted topics", type: "custom", headerTemplate: "Never discuss:",  value: ($p.restrictedTopics // "")}
  ]}')" | jq -r .id)

echo "[4/7] Picking a preset voice and visual"
VOICE_ID=$(call /v1/catalog-item/list '{"filter":{"typeEqual":"Voice"}}' | jq -r '.objects[0].itemId')
VISUAL_ID=$(call /v1/catalog-item/list '{"filter":{"typeEqual":"Visual"}}' | jq -r '.objects[0].itemId')

echo "[5/7] Creating the avatar"
AVATAR_ID=$(call /v1/avatar/create "$(jq -n --arg n "$NAME" --arg v "$VOICE_ID" --arg vis "$VISUAL_ID" '{
  name: $n, voice: {id: $v, speed: 1.0}, visual: {id: $vis}}')" | jq -r .id)

echo "[6/7] Creating the agent"
AGENT_ID=$(call /v1/agent/create "$(jq -n --arg n "$NAME" --argjson i "$INTELLECT_ID" --arg a "$AVATAR_ID" '{
  displayName: $n, intellect: {intellectType: "genie", id: $i},
  avatarIds: [$a], maxConversationLength: 600}')" | jq -r .agentId)

echo "[7/7] Resolving the widget"
WIDGET_ID=$(call /v1/application/resolveWidgetId "$(jq -n --arg a "$AGENT_ID" '{agentId: $a}')" | jq -r .widgetId)

echo
echo "Done: $NAME"
echo "  agentId:     $AGENT_ID"
echo "  widgetId:    $WIDGET_ID"
echo "  intellectId: $INTELLECT_ID"
echo "  avatarId:    $AVATAR_ID"
```

If the script stops, show the user the line it printed and stop (see rule 5). Do not run it again without asking: the steps before the failure already created objects. Note all four IDs it prints.

**If the user gave you the agent ID of a previous run** (rule 4), do not run the script. Get the intellect ID and the widget ID on `AGENTIC` instead:

```
POST {AGENTIC}/v1/agent/get
{ "agentId": "<agentId>" }

POST {AGENTIC}/v1/application/resolveWidgetId
{ "agentId": "<agentId>" }
```

The intellect ID is `intellect.id` in the first response, and the widget ID is `widgetId` in the second.

Then read the intellect. Its `id` is the integer intellect ID, not the agent ID:

```
POST {GENIE}/v1/intellect/get
{ "id": <intellectId> }
```

Remember `prompts` (a list), `tool_ids` (a list of `{ "id": ..., "condition": null }` objects or plain id strings) and `opening_phrase`.

### Step 2: create or update the four client tools

For each tool in [`client-tools.json`](client-tools.json), look it up by name:

```
POST {GENIE}/v1/tool/list
{ "filter": { "objectType": "ToolListFilter", "nameEquals": "<name>", "partnerIdEquals": <partnerId> } }
```

If `objects` is empty, create it. If a tool with that name exists, update it in place (this keeps its id, and any agent that already uses it keeps working):

```
POST {GENIE}/v1/tool/add
{ "name": "<name>", "config": <config> }

POST {GENIE}/v1/tool/update
{ "id": "<existing id>", "config": <config> }
```

Both return the tool's `id`. Build `<config>` from the JSON file like this. The field names differ between the file and the API:

| In `client-tools.json` | In `config` |
| --- | --- |
| (always) | `"type": "client"` |
| `name` | `name` |
| `description` | `description` |
| `args.<arg>.type` / `required` / `default` | the same keys |
| `args.<arg>.description` | `args.<arg>.prompt` |
| `waitForResponse` | `wait_for_response` |
| `timeoutSeconds` | `timeout` (integer, 1 to 120) |

Example, for `go_to`:

```json
{
  "name": "go_to",
  "config": {
    "type": "client",
    "name": "go_to",
    "description": "<description from the file>",
    "args": {
      "destination": { "type": "str", "required": true, "prompt": "<description of destination>" },
      "period": { "type": "str", "required": false, "prompt": "<description of period>" }
    },
    "wait_for_response": true,
    "timeout": 30
  }
}
```

Argument types are only `str`, `int` and `bool`. Tool names must match `^[a-zA-Z0-9_-]+$` and must stay exactly as in the file: the app handles them by name.

### Step 3: build the new prompts and tool list

Prompts are a list of objects with this shape: `{ "key", "label", "headerTemplate", "type": "custom", "value", "condition": null }`. Start from the agent's current `prompts` and change only these keys. Keep every other prompt as it is, in the same order.

| Key | `value` | If missing, add it with |
| --- | --- | --- |
| `knowledge` | the full text of [`prompt-knowledge.md`](prompt-knowledge.md), unchanged | label `Knowledge`, header `Additional contextual information is provided below. Use it as a source of factual context when appropriate:` |
| `appTools` | the full text of [`prompt-app-tools.md`](prompt-app-tools.md), unchanged | label `Tool`, header `When you use the app tools` |
| `name` | the text under "Name" in [`persona.md`](persona.md) | label `Name`, header `Your name is:` |
| `goal` | the text under "Goal" | label `Goal`, header `Your success in this interaction is measured by how effectively you pursue and fulfill this core strategic goal:` |
| `targetAudience` | the text under "Target audience" | label `Target Audience`, header `Adjust your vocabulary, technical depth, and professional tone to specifically resonate with the following group of people:` |
| `restrictedTopics` | the text under "Restricted topics" | label `Restricted Topics`, header `To maintain professional standards and brand safety, you are strictly forbidden from mentioning, acknowledging, or discussing these topics under any circumstances:` |

For a key that already exists, replace only its `value` and keep its label, header and condition.

Copy the prompt files **verbatim**. Text like `{{currentScreen}}`, `{{progressPeriod}}`, `{{memberName}}` and `{{goal}}` are runtime variables that the app fills in. Do not replace or escape them.

The opening phrase is the text under "Opening phrase" in [`persona.md`](persona.md).

Tool list: take the agent's current `tool_ids`, and add the ids of the four tools if they are not already attached. Do not remove anything.

### Step 4: write the agent

Show the user the summary, wait for their yes, then send one update. `prompts` and `tool_ids` **replace** the whole lists, so send the complete lists you built in step 3, not only the changes:

```
POST {GENIE}/v1/intellect/update
{
  "id": <intellectId>,
  "type": "internal",
  "prompts": [ ... ],
  "tool_ids": [ ... ],
  "opening_phrase": "<opening phrase>"
}
```

### Step 5: verify

Read the intellect again with `/v1/intellect/get` and check:

- `tool_ids` contains the ids of `get_training_summary`, `go_to`, `propose_workout_plan` and `get_plan_result`, and everything that was attached before is still there.
- The `prompts` keys include `knowledge` and `appTools`, and their values equal the file contents exactly.
- `opening_phrase` equals the phrase from `persona.md`.
- The prompts you did not change are unchanged.

Running steps 1 to 5 again with the same agent ID (skip the script) should now report "no changes".

### Report

Tell the user, in plain words: the ID of the new agent and its widget ID, and that they must put the widget ID in `WIDGET_ID` in the `.env` file of the app they run; which tools were created, updated or already up to date; which prompts changed; the opening phrase before and after; anything you left alone (other tools, other prompts); and the one thing they must do next, which is to run one of the example apps (or build their own app side, see [`flow.md`](flow.md)), because the agent only works once the app answers its four tools.

### Troubleshooting

- **The agent never calls the tools.** Check that the tools are attached (step 5). If the agent has a capability called `kaltura_genie_experiences` turned on, it can take priority over custom tools: tell the user and ask how to turn it off. Do not guess an endpoint for it.
- **The tool is called but the agent says it timed out.** The app must answer every `tool` message from the page with `window.onToolResult({ id, data })` (see the [bridge contract](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps-avatar-page#bridge-contract)). `propose_workout_plan` does not wait for the user: native answers `{ ok: true, opened: true }` when the sheet opens. When the member saves or dismisses, native sends the text `[app event] plan_decided` and the agent calls `get_plan_result` to read the decision (see [`flow.md`](flow.md)).
- **A prompt change has no effect in a running session.** A running session may keep the prompts it started with. End the session and start a new one.
- **403 or "not allowed".** The KS is not an admin KS for this partner, or it has expired.
