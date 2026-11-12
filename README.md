# ForgePilot — AI Engineering Teammate

> Phase 1: VS Code Extension Foundation

ForgePilot is a VS Code-native AI coding assistant. This repository contains the **Phase 1** foundation — the complete UI, activity bar, sidebar, chat interface, Agent Mode, Inline Edit, and Webview message bridge.

**Phase 2** will wire the TrueForge agent runtime to the existing message contract.

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x |
| npm | 9.x |
| VS Code | 1.85.0 |
| Git | any recent |

---

## Setup

```bash
git clone https://github.com/aditidange29-git/ForgePilot
cd ForgePilot
npm install
npm run compile
```

---

## Run in VS Code (F5)

1. Open the `ForgePilot` folder in VS Code.
2. Press **F5** → select **VS Code Extension Development Host**.
3. The new VS Code window will have the ForgePilot icon in the Activity Bar.
4. Click the icon to open the sidebar.

---

## Commands

| Command | Action |
|---------|--------|
| `ForgePilot: Open` | Opens the sidebar |
| `ForgePilot: New Chat` | Starts a new conversation |
| `ForgePilot: Clear Chat` | Clears current messages |

---

## Project Structure

```
ForgePilot/
├── src/
│   ├── extension.ts               Entry point
│   ├── commands/
│   │   ├── openForgePilot.ts
│   │   ├── newChat.ts
│   │   └── clearChat.ts
│   ├── providers/
│   │   └── ForgePilotViewProvider.ts   Webview provider
│   ├── services/
│   │   ├── StateService.ts        Conversation & status state
│   │   └── MessageService.ts      Message routing & validation
│   ├── types/
│   │   └── messages.ts            Message contract (Phase 1 v1.0.0)
│   └── webview/
│       ├── index.html
│       ├── styles.css
│       └── script.js
├── media/icons/forgepilot.svg
├── package.json
├── tsconfig.json
└── CHANGELOG.md
```

---

## Message Contract (for Phase 2)

All communication between the Webview and the Extension Host is typed and documented in `src/types/messages.ts`.

### Webview → Extension Host

| Type | Payload |
|------|---------|
| `SEND_MESSAGE` | `{ message, conversationId, mode }` |
| `NEW_CHAT` | — |
| `CLEAR_CHAT` | — |
| `CANCEL_REQUEST` | — |
| `INLINE_EDIT_REQUEST` | `{ instruction, selectedCode? }` |
| `AGENT_MODE_CHANGED` | `{ enabled }` |

### Extension Host → Webview

| Type | Payload |
|------|---------|
| `MESSAGE_RECEIVED` | `{ messageId, role, content, timestamp }` |
| `STATUS_UPDATE` | `{ status }` |
| `ERROR` | `{ message }` |
| `CHAT_CLEARED` | `{ newConversationId }` |

### Connection Status values

`not-connected` · `connecting` · `ready` · `working` · `error`

---

## Phase 2 Integration Notes

To integrate TrueForge:

1. In `MessageService.ts`, replace the `setTimeout` placeholder in `_handleSendMessage` with a TrueForge agent call.
2. Call `this.sendStatus('connecting')` before the call and `'ready'`/`'error'` after.
3. Never set status to `ready` unless the backend has actually confirmed a connection.
4. Use `CANCEL_REQUEST` from the Webview to cancel in-flight requests.
5. For streaming, call `this.sendToWebview({ type: 'MESSAGE_RECEIVED', ... })` per chunk.
6. Populate `selectedCode` in `INLINE_EDIT_REQUEST` from the VS Code editor selection API.

---

## Known Limitations (Phase 1)

- AI responses are placeholder text only — no backend is connected.
- `Inline Edit` panel accepts input but does not submit (disabled button).
- Agent Mode toggle changes UI state only — no autonomous execution.
- Status never reaches `ready` or `connecting` — always `not-connected`.
- No automated UI tests (manual test checklist below).

---

## Manual Test Checklist

| Test | Expected |
|------|----------|
| Press F5, open sidebar | ForgePilot appears, status = Not Connected |
| Send a message | User bubble appears, placeholder assistant reply appears |
| Press Enter | Message sent |
| Press Shift+Enter | New line inserted |
| Send empty message | Nothing happens |
| New Chat (button or command) | Conversation cleared |
| Clear Chat (command) | Messages cleared |
| Toggle Agent Mode | UI reflects ON/OFF, mode label changes |
| Open Inline Edit | Panel opens |
| Cancel Inline Edit | Panel closes |
| Reopen sidebar | Extension stable, no errors in console |
