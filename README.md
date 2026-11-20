# ForgePilot — AI Engineering Teammate

A VS Code extension that brings an AI coding assistant into the editor, built on the TrueForge agent runtime by TrueFoundry.

![ForgePilot demo](docs/demo.gif)

## Problem

Developers often leave their editor to get AI help, then copy answers back by hand. ForgePilot is a VS Code extension that brings an AI engineering teammate into the editor, built on the TrueForge agent runtime. It streams answers, proposes edits for selected code, and keeps the developer in control of what gets sent and what gets changed.

## What it does

- **Chat Mode:** ask questions about your code and get streamed answers.
- **Agent Mode:** structured engineering analysis and recommendations.
- **Inline Edit:** select code, give an instruction, and get a proposed edit.
- **Stop, New Chat and Clear Chat** for full control of each conversation.
- [Add your approval-gated feature here once it works]

## How it uses TrueForge

TrueForge runs the agent loop, manages sessions, and streams turn events. ForgePilot does not implement its own agent loop. It connects through the TrueForge SDK (`@truefoundry/trueforge-sdk@0.185.0`) and shows **Ready** only after the server's capabilities endpoint responds.

## Technology stack

| Technology | Purpose |
|---|---|
| TypeScript | Extension logic |
| JavaScript, HTML, CSS | Webview UI |
| VS Code API | Editor integration |
| TrueForge SDK | Agent runtime |
| Node.js test runner | Unit tests |

## Quick start

**Requirements:** Node.js 22.14+, npm 9+, VS Code 1.100.0+, Git

```bash
git clone https://github.com/aditidange29-git/ForgePilot.git
cd ForgePilot
npm ci
npm run compile
```

1. Start the TrueForge server: `npx @truefoundry/trueforge@latest` (default `http://localhost:8790`).
2. Configure at least one model in the TrueForge server. Provider API keys go on the server, never in this repo.
3. Open the folder in VS Code, press **F5**, and choose **Run ForgePilot Extension**.
4. In the new window, click the ForgePilot icon, or run **ForgePilot: Connect to TrueForge**.

If the server is not at the default address, set `forgepilot.trueforge.baseUrl` in VS Code settings. If authentication is enabled, run **ForgePilot: Set TrueForge Access Token**.

## Commands

| Command | Action |
|---|---|
| ForgePilot: Open | Opens the sidebar |
| ForgePilot: New Chat | Starts a new conversation and session |
| ForgePilot: Clear Chat | Starts a fresh conversation and session |
| ForgePilot: Connect to TrueForge | Checks or re-establishes the connection |
| ForgePilot: Set TrueForge Access Token | Stores an optional token in SecretStorage |
| ForgePilot: Clear TrueForge Access Token | Removes the stored token |

## Privacy

- Ordinary chat sends only the typed prompt.
- Inline Edit sends only the selected code and your instruction.
- Access tokens are stored in VS Code SecretStorage and never sent to the webview.

## Runtime and sessions

- The TrueForge SDK is pinned to `0.185.0` and requires Node.js 22 or later. The extension is built as ESM to load the SDK.
- Each workspace conversation reuses its TrueForge session between turns. Session and conversation IDs persist in VS Code workspace state.
- Assistant text streams through the SDK using Server-Sent Events.
- Stop aborts the active request and asks TrueForge to cancel the running turn.
- Model provider API keys belong on the TrueForge server, never in ForgePilot settings, the webview, or this repo.

## Project structure

```
src/
├── extension.ts
├── commands/
├── providers/
│   └── ForgePilotViewProvider.ts
├── services/
│   ├── StateService.ts
│   ├── MessageService.ts
│   ├── TrueForgeClient.ts
│   ├── TrueForgeSessionService.ts
│   ├── StreamingService.ts
│   ├── ConnectionService.ts
│   ├── EditorSelectionService.ts
│   └── PromptService.ts
├── types/
│   ├── messages.ts
│   └── trueforge.ts
├── test/
└── webview/
    ├── index.html
    ├── styles.css
    └── script.js
```

## Testing

```bash
npm test
```

## Known limitations

- Agent Mode gives recommendations only. It does not edit files or run commands yet.
- Inline Edit returns a proposed change as chat text and does not apply it.
- Clearing a chat does not delete the old session on the TrueForge server.

## Roadmap

- [ ] Approval checkpoint with diff view before applying edits
- [ ] Run tests in the TrueForge sandbox and show results in the sidebar

## AI tools used while building

[ Claude, kiro, Chatgpt , antigravity]

## License

MIT
