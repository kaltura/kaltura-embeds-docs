# Kaltura Embeds Docs: Examples

Runnable examples for building with Kaltura embeds: conversational avatars, chat and Dynamic UI, in web pages and native apps.

Each example is self-contained: its own folder, its own README, no build step and no dependencies to install unless it says otherwise. Bring your own Kaltura IDs through a local `.env` file; nothing account-specific is committed.

Documentation: [docs.kaltura.com](https://docs.kaltura.com/docs/conversational-agents/conversational-agents)

## Examples

| Example | What it shows | Docs |
| --- | --- | --- |
| [react-native-avatar](examples/react-native-avatar) | A conversational avatar inside a native iOS / Android / React Native app, hosted in a WebView. Headless (the avatar works with the app's content) and contained (the avatar also creates the content), a JSON bridge, client tools that open native screens and fill native forms, and resuming a conversation. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |

## Running an example

```bash
cd examples/<name>
cp .env.example .env    # fill in your IDs
npm start
```

Most examples need Node 20.6 or later and an agent (widget ID and partner ID) of your own.

## Adding an example

1. Create `examples/<kebab-case-name>/`.
2. Keep it runnable on its own: a `package.json` with a `start` script, and no dependencies unless the example is about them.
3. Read every account-specific value (widget ID, partner ID, hosts) from `.env`, and commit a `.env.example` that lists them with comments. Never commit `.env`, a KS, or a secret.
4. Use fictional brands, people and data in scenarios.
5. Write a `README.md` with these sections: what it shows, run it, configuration, how it works, and a link to the matching docs page.
6. Add a row to the table above.

## Layout

```
kaltura-embeds-docs/
├── README.md
└── examples/
    └── react-native-avatar/
```
