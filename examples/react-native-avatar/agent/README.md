# Set up the agent for this example

This folder holds everything the example's agent needs: client tools, prompts, persona and opening phrase. This page explains how to apply them to an agent of your own. It is written for two readers:

- **You**, if you want an AI assistant (Claude, ChatGPT or similar) to do the setup for you: use [the prompt below](#for-you-let-an-ai-assistant-do-it).
- **An AI agent** that was asked to do the setup: follow [the instructions for the agent](#instructions-for-the-ai-agent).

If you would rather configure it by hand, see [By hand in the console](#by-hand-in-the-console).

## What gets configured

| File | Goes to |
| --- | --- |
| [`client-tools.json`](client-tools.json) | Three client tools: `get_training_summary`, `go_to`, `propose_workout_plan` |
| [`prompt-knowledge.md`](prompt-knowledge.md) | The agent's `knowledge` prompt |
| [`prompt-app-tools.md`](prompt-app-tools.md) | The agent's `appTools` prompt |
| [`persona.md`](persona.md) | The `name`, `goal`, `targetAudience` and `restrictedTopics` prompts, and the opening phrase |
| [`flow.md`](flow.md) | Background only: the scenario the agent follows. Nothing in it is applied |

You need an **internal** agent (intellect) on your partner that you are allowed to change. Use a test agent, not a production one: the setup replaces the agent's `knowledge` prompt, its persona prompts and its opening phrase.

## For you: let an AI assistant do it

Give your assistant access to this folder (open the repo in your coding assistant, or paste the files into the chat), then send it this prompt. Fill in the values in brackets.

> Set up my Kaltura agent for the react-native-avatar example. Follow `examples/react-native-avatar/agent/README.md`, section "Instructions for the AI agent".
> - Agent (intellect) ID: `[ID]`
> - Partner ID: `[partner ID]`
> - Region / environment: `[prod, or the environment name]`
> - First show me what you would change (a dry run) and wait for my OK before you write anything.
>
> I will give you a Kaltura admin session (KS) when you ask for it. Do not print it or save it to a file.

What the assistant needs from you:

- The agent ID, from the agent's page in the Kaltura admin console.
- A **partner admin KS** for that partner (a session with the `disableentitlement` privilege). Treat it like a password: it is valid for a short time, but it can change your account. Paste it only into a tool you trust, and prefer an environment variable over the chat.
- Whether you use the US production region or another environment.

An assistant that can only chat, and cannot make HTTP requests, cannot do the setup. Ask it for the exact values to paste in the console instead, and follow [By hand in the console](#by-hand-in-the-console).

## Instructions for the AI agent

You are setting up a Kaltura conversational agent so it can run the react-native-avatar example. Work from the files in this folder. Do exactly what is listed here and nothing else.

### Rules

1. **Never print, log or store the KS or any secret.** Read it from an environment variable (for example `KS`) or from the user once, and keep it in memory.
2. **Dry run first.** Read the agent, work out the changes, show the user a summary (see [Report](#report)), and wait for a clear yes before the first write.
3. **Touch only the agent ID you were given.** Never create, rename or delete other agents.
4. **Keep what is already there.** Keep other prompts, other attached tools and every other agent setting. Never delete a tool.
5. **Be idempotent.** Running the setup twice must give the same result and no duplicate tools.
6. If a request fails, stop, show the HTTP status and the response body (without the KS) and ask the user. Do not retry blindly or guess other endpoints.

### Inputs to collect

Ask for any that are missing: the agent ID, the partner ID, the region or environment, and a partner admin KS. Without an admin KS, stop and tell the user how to get one (or switch to the manual steps).

Hosts, for the US production region:

- Genie API: `https://genie.nvp1.ovp.kaltura.com` (call it `GENIE`)
- Kaltura API, if you need to mint a KS from an admin secret: `https://www.kaltura.com/api_v3`

For another environment the hostnames follow the pattern `https://genie.<env>.ovp.kaltura.com` and `https://api.<env>.ovp.kaltura.com/api_v3`. Ask the user to confirm them.

All Genie calls are `POST` with JSON bodies and the headers `Content-Type: application/json` and `Authorization: KS <ks>`.

### Step 1: read the agent

```
POST {GENIE}/v1/intellect/get
{ "id": <agentId> }
```

Check that `type` is `internal` (or missing). Remember `prompts` (a list), `tool_ids` (a list of `{ "id": ..., "condition": null }` objects or plain id strings) and `opening_phrase`. If the call is refused or the agent belongs to another partner, stop.

### Step 2: create or update the three client tools

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

Tool list: take the agent's current `tool_ids`, and add the ids of the three tools if they are not already attached. Do not remove anything.

### Step 4: write the agent

Show the user the summary, wait for their yes, then send one update. `prompts` and `tool_ids` **replace** the whole lists, so send the complete lists you built in step 3, not only the changes:

```
POST {GENIE}/v1/intellect/update
{
  "id": <agentId>,
  "type": "internal",
  "prompts": [ ... ],
  "tool_ids": [ ... ],
  "opening_phrase": "<opening phrase>"
}
```

### Step 5: verify

Read the agent again with `/v1/intellect/get` and check:

- `tool_ids` contains the ids of `get_training_summary`, `go_to` and `propose_workout_plan`, and everything that was attached before is still there.
- The `prompts` keys include `knowledge` and `appTools`, and their values equal the file contents exactly.
- `opening_phrase` equals the phrase from `persona.md`.
- The prompts you did not change are unchanged.

Running the steps again should now report "no changes".

### Report

Tell the user, in plain words: which tools were created, updated or already up to date; which prompts changed; the opening phrase before and after; anything you left alone (other tools, other prompts); and the one thing they must do next, which is to build the app side (see [`flow.md`](flow.md)) because the agent only works once the app answers its three tools.

### Troubleshooting

- **The agent never calls the tools.** Check that the tools are attached (step 5). If the agent has a capability called `kaltura_genie_experiences` turned on, it can take priority over custom tools: ask the user to turn it off in the console.
- **The tool is called but the agent says it timed out.** The app must answer every `toolCall` with a `toolResult` (see the bridge contract in the [example README](../README.md)). `propose_workout_plan` waits up to 120 seconds for the user.
- **A prompt change has no effect in a running session.** A running session may keep the prompts it started with. End the session and start a new one.
- **403 or "not allowed".** The KS is not an admin KS for this partner, or it has expired.

## By hand in the console

1. Open the agent in the Kaltura admin console.
2. **Tools:** create three client tools with the names, descriptions and arguments from [`client-tools.json`](client-tools.json), turn **Wait for response** on, set the timeouts from the file, and attach them to the agent.
3. **Prompts:** set the `knowledge` and `appTools` prompts to the contents of [`prompt-knowledge.md`](prompt-knowledge.md) and [`prompt-app-tools.md`](prompt-app-tools.md). Set the name, goal, target audience and restricted topics from [`persona.md`](persona.md).
4. **Opening phrase:** set it to the phrase in [`persona.md`](persona.md).
5. Start a new session to try it.
