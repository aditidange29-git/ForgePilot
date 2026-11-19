# ForgePilot — AI Engineering Teammate

> Phase 2: TrueForge Agent Runtime Integration

ForgePilot is a VS Code-native AI coding assistant connected to the official TrueForge agent runtime SDK. TrueForge runs the agent loop, manages sessions, and streams turn events; ForgePilot does not implement a separate agent loop.

# 7. Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Extension application logic |
| JavaScript | Webview interaction logic |
| HTML | Webview structure |
| CSS | Interface styling |
| Node.js | Extension development runtime |
| npm | Dependency management |
| Visual Studio Code API | Extension integration |
| TrueForge SDK | AI agent runtime integration |
| Node.js Test Runner | Automated unit testing |
| Git and GitHub | Version control and collaboration |

### Key Dependency

```json
{
  "@truefoundry/trueforge-sdk": "0.185.0"
}
```

| Tool | Minimum version |
|------|----------------|
| Node.js (TrueForge server and development) | 22.14 or later |
| TrueForge server Node.js | 22.14 or later |
| npm | 9.x or later |
| VS Code | 1.100.0 or later |
| Git | any recent |

## Setup

```bash
cd ForgePilot
```

## Step 3: Install Dependencies

```bash
npm ci
```

## Step 4: Compile TypeScript

```bash
npm run compile
```

## Run in VS Code (F5)

1. Open the `ForgePilot` folder in VS Code.
2. Press **F5** and select **VS Code Extension Development Host**.
3. Click the ForgePilot icon in the Activity Bar.

## TrueForge connection

1. Start TrueForge locally with `npx @truefoundry/trueforge@latest`. The default address is `http://localhost:8790`.
2. Configure at least one model in the TrueForge server. ForgePilot selects from the models returned by the server; it does not assume a model name.
3. Set `forgepilot.trueforge.baseUrl` in VS Code settings if the server is not using the default address.
4. Run **ForgePilot: Connect to TrueForge**, or open the ForgePilot view. ForgePilot shows Ready only after the SDK successfully calls the server capabilities endpoint.
5. If authentication is enabled, run **ForgePilot: Set TrueForge Access Token**. The token is stored in VS Code SecretStorage and is never sent to the Webview. Use **ForgePilot: Clear TrueForge Access Token** to remove it.

## Chat modes and privacy

- **Chat Mode** sends only the typed prompt and asks TrueForge for a direct answer.
- **Agent Mode** sends a different system instruction asking for structured engineering analysis and actionable recommendations. This integration does not grant workspace editing or command execution, and the agent is instructed not to claim it performed either.
- Ordinary chat never includes the current editor selection. **Inline Edit** sends only the selected code and its instruction as prompt context; it returns a proposed edit and does not change workspace files.
- **Clear Chat** and **New Chat** both create and synchronize a fresh ForgePilot conversation ID, remove its old local session mapping, and create a fresh TrueForge session on the next message. The old server-side session is not deleted.

# 11. Running ForgePilot

## Method 1: Run and Debug

1. Open the ForgePilot project folder in VS Code.
2. Open the Run and Debug panel.
3. Select `Run ForgePilot Extension`.
4. Press `F5`.
5. Wait for the Extension Development Host window.
6. Locate ForgePilot in the Activity Bar.
7. Open the sidebar.

The project includes a development launch configuration in:

```text
.vscode/launch.json
```

## Method 2: Command Line

| Command | Action |
|---------|--------|
| `ForgePilot: Open` | Opens the sidebar |
| `ForgePilot: New Chat` | Starts a new conversation and TrueForge session |
| `ForgePilot: Clear Chat` | Starts a fresh conversation and TrueForge session |
| `ForgePilot: Connect to TrueForge` | Checks or re-establishes the server connection |
| `ForgePilot: Set TrueForge Access Token` | Securely stores an optional server token |
| `ForgePilot: Clear TrueForge Access Token` | Removes the stored token |

## Project structure

```json
{
  "type": "SEND_MESSAGE",
  "message": "Explain this function",
  "conversationId": "conversation-id",
  "mode": "chat"
}
```
src/
├── extension.ts
├── commands/
├── providers/ForgePilotViewProvider.ts
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
└── webview/
    ├── index.html
    ├── styles.css
    └── script.js
```

## Runtime and sessions

- The TrueForge SDK dependency is pinned to `0.185.0`; its package requires Node.js 22 or later. The extension is emitted as ESM to load the SDK's supported ESM entry point.
- `engines.vscode` remains `^1.100.0` and `@types/vscode` is pinned to `1.100.0`. VS Code controls the extension-host Node.js version, so compatibility of every VS Code build at that minimum with the SDK's Node.js floor has not been verified.
- Each workspace conversation reuses its TrueForge session for later turns. Session IDs and the current conversation ID are persisted through VS Code workspace state.
- Assistant text streams through SDK `0.185.0` Server-Sent Events, using event metadata and event-delta helpers. Stop aborts the active SDK request and asks TrueForge to cancel the running turn.
- Model-provider API keys belong in the TrueForge server, not ForgePilot settings, the Webview, or the repository.

## Known limitations

- Agent Mode provides structured planning and recommendations only; workspace file edits and command execution are not implemented.
- Inline Edit returns a proposed change as chat text; it does not apply the change to the editor.
- Clearing a conversation disconnects its local session mapping but leaves the old session stored on the TrueForge server.
