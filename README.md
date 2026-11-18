# ForgePilot — AI Engineering Teammate

<p align="center">
  <strong>A VS Code-native AI engineering assistant powered by the TrueForge runtime.</strong>
</p>

<p align="center">
  Build, debug, understand, and improve software directly from your development environment.
</p>

---

## Table of Contents

1. [Introduction](#introduction)
2. [Vision](#vision)
3. [Project Evolution](#project-evolution)
4. [Features](#features)
5. [How ForgePilot Works](#how-forgepilot-works)
6. [Architecture](#architecture)
7. [Technology Stack](#technology-stack)
8. [Requirements](#requirements)
9. [Installation](#installation)
10. [Configuration](#configuration)
11. [Running ForgePilot](#running-forgepilot)
12. [Available Commands](#available-commands)
13. [Working Modes](#working-modes)
14. [Conversation and Session Management](#conversation-and-session-management)
15. [Streaming Architecture](#streaming-architecture)
16. [Message Contract](#message-contract)
17. [Project Structure](#project-structure)
18. [Development Workflow](#development-workflow)
19. [Testing and Verification](#testing-and-verification)
20. [Security and Reliability](#security-and-reliability)
21. [Current Limitations](#current-limitations)
22. [Roadmap](#roadmap)
23. [Contributing](#contributing)
24. [License](#license)

---

# 1. Introduction

ForgePilot is an AI Engineering Teammate built as a native Visual Studio Code extension.

It brings AI-powered development assistance directly into the developer's coding environment, combining a dedicated VS Code interface with the TrueForge agent runtime.

Instead of switching between multiple applications, developers can interact with an AI assistant from their editor, manage conversations, receive streamed responses, request engineering recommendations, and generate code modification proposals using selected editor context.

ForgePilot is designed around a modular architecture that separates the user interface, message communication, prompt construction, streaming, session management, and runtime integration.

**Project Repository:**  
https://github.com/aditidange29-git/ForgePilot

**Current Development Stage:** Phase 2 — TrueForge Runtime Integration

---

# 2. Vision

The goal of ForgePilot is to evolve beyond a conventional AI chat interface into an engineering teammate that understands and supports the software development workflow.

The long-term vision includes:

- Understanding developer intent.
- Supporting software architecture and engineering decisions.
- Helping developers understand unfamiliar codebases.
- Assisting with debugging and problem-solving.
- Generating and reviewing code modifications.
- Supporting multi-step engineering workflows.
- Integrating AI agents into the development environment.

ForgePilot aims to make AI assistance more contextual, structured, and accessible within VS Code.

---

# 3. Project Evolution

ForgePilot is being developed incrementally.

## Phase 1 — VS Code Extension Foundation

The first phase established the extension architecture and user interface.

Implemented components:

- VS Code extension entry point.
- Dedicated Activity Bar icon.
- Sidebar and Webview interface.
- Chat interface.
- Agent Mode interface.
- Inline Edit interface.
- Typed Webview-to-Extension message contract.
- Extension commands.
- Conversation UI state.
- Basic communication bridge.

Phase 1 established the foundation required for connecting an external AI runtime.

## Phase 2 — TrueForge Runtime Integration

The second phase connects the existing extension architecture with the TrueForge agent runtime.

Implemented components:

- TrueForge SDK integration.
- Runtime-backed message handling.
- Dedicated prompt construction service.
- Streaming response service.
- TrueForge session management.
- Conversation ID synchronization.
- Chat Mode and Agent Mode prompt separation.
- Explicit editor selection handling for Inline Edit.
- Request cancellation.
- Runtime error propagation.
- Stale conversation request validation.
- Automated unit tests.

The Phase 2 implementation builds on the existing Phase 1 architecture rather than replacing it.

---

# 4. Features

## 4.1 Native VS Code Integration

ForgePilot operates inside Visual Studio Code.

Features include:

- Dedicated ForgePilot Activity Bar icon.
- Integrated sidebar interface.
- Webview-based chat experience.
- Extension Host and Webview communication.
- Command Palette integration.
- Development Host launch configuration.

## 4.2 AI-Powered Chat

The Chat Mode allows developers to interact with the TrueForge runtime using natural-language prompts.

Capabilities:

- Submit developer prompts.
- Receive runtime-generated responses.
- Maintain conversation context through sessions.
- Display streamed responses.
- Handle request errors and cancellation.

## 4.3 Agent Mode

Agent Mode provides a structured engineering assistance experience.

It uses mode-specific instructions to encourage organized responses, recommendations, and problem-solving.

Potential engineering use cases include:

- Technical planning.
- Architecture recommendations.
- Debugging guidance.
- Implementation suggestions.
- Development workflow guidance.

**Current scope:** Agent Mode generates structured recommendations. Autonomous tool execution and automatic repository modifications are not currently implemented.

## 4.4 Inline Edit

Inline Edit allows developers to provide an instruction along with explicitly selected editor code.

Workflow:

1. Select code in the VS Code editor.
2. Open Inline Edit.
3. Enter the desired modification instruction.
4. Submit the request.
5. ForgePilot sends the explicit code context to the runtime.
6. Receive a modification proposal.

Inline Edit is designed to support context-aware code assistance without automatically changing workspace files.

**Current scope:** Proposals are generated, but automatic application of modifications is not implemented.

## 4.5 Streaming Responses

ForgePilot includes a dedicated streaming service.

It processes runtime events and handles:

- Main-thread response events.
- Streaming deltas.
- Delta merging.
- Completed messages.
- Cancellation events.
- Runtime errors.
- Terminal event validation.

The implementation avoids displaying duplicate response content when streaming deltas and completed messages are both available.

## 4.6 Conversation Management

ForgePilot manages conversations using synchronized conversation IDs.

Features:

- New Chat.
- Clear Chat.
- Fresh session creation.
- Conversation state synchronization.
- Stale request rejection.
- Session mapping management.
- Webview state restoration.

## 4.7 Request Cancellation

ForgePilot supports cancellation of active requests.

Cancellation handling includes:

- Webview cancellation messages.
- SDK stream cancellation.
- TrueForge session cancellation where supported.
- Cancellation state propagation.
- Prevention of stale request updates.

## 4.8 Error Handling

Runtime failures are communicated back to the Webview.

The extension handles:

- Request failures.
- Streaming errors.
- Cancellation.
- Missing completion events.
- Stale conversation requests.
- Runtime communication failures.

---

# 5. How ForgePilot Works

ForgePilot follows a host-and-Webview architecture.

The Webview provides the developer-facing interface, while the VS Code Extension Host manages application logic and runtime communication.

A typical Chat Mode request follows this flow:

1. Developer enters a prompt.
2. Webview creates a typed message.
3. Extension Host receives and validates the message.
4. Message Service checks the active conversation ID.
5. Prompt Service constructs the appropriate instructions.
6. TrueForge Session Service manages the runtime session.
7. Streaming Service processes runtime events.
8. Responses are forwarded to the Webview.
9. The interface displays the assistant response.

For Inline Edit, selected editor code is explicitly collected and attached to the request.

For normal Chat Mode, editor selection is not automatically attached.

---

# 6. Architecture

```text
                    FORGEPILOT
                         |
          +--------------+--------------+
          |                             |
      VS CODE HOST                 WEBVIEW UI
          |                             |
    Extension Entry                Chat Interface
          |                             |
    View Provider                  User Interactions
          |                             |
    Message Service <----------> Message Bridge
          |
    Prompt Service
          |
    TrueForge Session Service
          |
    Streaming Service
          |
    Connection Service
          |
    State Service
          |
      TrueForge SDK
          |
     TRUEFORGE RUNTIME
```

## Architecture Responsibilities

| Component | Responsibility |
|---|---|
| Extension Entry | Initializes the extension and registers functionality |
| View Provider | Manages the ForgePilot Webview |
| Message Service | Handles incoming messages and routing |
| Prompt Service | Constructs mode-specific prompts |
| Streaming Service | Processes streaming events and responses |
| TrueForge Session Service | Manages TrueForge sessions |
| Connection Service | Handles connection-related operations |
| State Service | Maintains conversation and application state |
| Webview | Displays the interface and manages user interactions |

---

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

The project uses the pinned TrueForge SDK version in its dependency configuration.

---

# 8. Requirements

| Tool | Minimum requirement |
|---|---|
| Node.js | 22.14.0 |
| npm | Compatible with the project lockfile |
| Visual Studio Code | 1.100.0 |
| Git | Recent version |

Check installed versions:

```bash
node --version
npm --version
git --version
```

---

# 9. Installation

## Step 1: Clone the Repository

```bash
git clone https://github.com/aditidange29-git/ForgePilot.git
```

## Step 2: Navigate to the Project

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

## Step 5: Run Automated Tests

```bash
npm test
```

If compilation and tests pass, the development build is ready for Extension Host testing.

---

# 10. Configuration

ForgePilot uses the TrueForge SDK for runtime communication.

A valid TrueForge environment and access token are required for authenticated runtime interactions.

The extension includes commands for configuring and clearing the TrueForge access token.

### Access Token Management

Use the VS Code Command Palette:

```text
ForgePilot: Set TrueForge Access Token
```

To remove the stored token:

```text
ForgePilot: Clear TrueForge Access Token
```

The extension should use VS Code SecretStorage for sensitive credential storage.

Do not commit access tokens, credentials, or environment secrets to GitHub.

**Important:** Token configuration alone does not prove that a live TrueForge connection has been established. Runtime connectivity must be verified separately.

---

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

From the project root:

```powershell
code --new-window --disable-extensions --extensionDevelopmentPath="$PWD"
```

This launches a separate VS Code development window with other extensions disabled.

---

# 12. Available Commands

| Command | Description |
|---|---|
| `ForgePilot: Open` | Opens the ForgePilot sidebar |
| `ForgePilot: New Chat` | Starts a new conversation |
| `ForgePilot: Clear Chat` | Clears the current conversation |
| `ForgePilot: Connect to TrueForge` | Initiates the connection workflow |
| `ForgePilot: Set TrueForge Access Token` | Configures the access token |
| `ForgePilot: Clear TrueForge Access Token` | Clears the stored token |

Commands can be accessed through the VS Code Command Palette using `Ctrl + Shift + P`.

---

# 13. Working Modes

## Chat Mode

Chat Mode is designed for conversational engineering assistance.

Request flow:

```text
Developer Prompt
      |
      v
Webview Message
      |
      v
Message Validation
      |
      v
Prompt Construction
      |
      v
TrueForge Runtime
      |
      v
Streaming Response
      |
      v
Chat Interface
```

Normal Chat Mode sends the typed prompt without automatically including the currently selected editor code.

## Agent Mode

Agent Mode uses different instructions from Chat Mode.

It is intended to produce structured engineering recommendations and more organized problem-solving responses.

The current implementation does not claim that the agent can independently execute tools or modify files.

## Inline Edit Mode

Inline Edit is designed for targeted code assistance.

Request flow:

```text
Editor Selection
       |
       v
User Instruction
       |
       v
Inline Edit Request
       |
       v
Explicit Code Context
       |
       v
Prompt Construction
       |
       v
TrueForge Runtime
       |
       v
Modification Proposal
```

Selected code is included only when explicitly requested through Inline Edit.

---

# 14. Conversation and Session Management

Conversation management is handled by the extension services.

Each active conversation uses a synchronized conversation identifier.

### New Chat

When a new conversation is created:

1. A new conversation ID is generated.
2. Webview state is synchronized.
3. Previous session mapping is cleaned up after active work settles.
4. A fresh runtime session is used for subsequent requests.

### Clear Chat

Clear Chat resets the active conversation context and creates a fresh conversation ID.

### Stale Request Protection

The extension validates conversation IDs before accepting messages.

Requests associated with outdated conversation IDs are rejected to prevent old responses from affecting the active conversation.

### Webview Restoration

Conversation state can be restored when the Webview becomes ready again.

---

# 15. Streaming Architecture

Streaming is implemented through the dedicated `StreamingService`.

The service processes TrueForge runtime events and manages response assembly.

Responsibilities include:

- Processing event metadata.
- Identifying main-thread output.
- Handling response deltas.
- Merging incremental content.
- Detecting completion events.
- Handling cancellation.
- Propagating terminal errors.
- Rejecting incomplete streams without valid completion.

The streaming implementation also handles cases where a completed main-thread message is available without previously emitted deltas.

---

# 16. Message Contract

ForgePilot uses a typed communication contract between the Webview and Extension Host.

The contract is maintained in:

```text
src/types/messages.ts
```

## Webview → Extension Host

| Message | Purpose |
|---|---|
| `SEND_MESSAGE` | Sends a user prompt |
| `NEW_CHAT` | Starts a fresh conversation |
| `CLEAR_CHAT` | Clears current conversation |
| `CANCEL_REQUEST` | Cancels an active request |
| `INLINE_EDIT_REQUEST` | Sends an editing instruction and optional selected code |
| `AGENT_MODE_CHANGED` | Communicates Agent Mode state |

### SEND_MESSAGE

Conceptual payload:

```json
{
  "type": "SEND_MESSAGE",
  "message": "Explain this function",
  "conversationId": "conversation-id",
  "mode": "chat"
}
```

### INLINE_EDIT_REQUEST

Conceptual payload:

```json
{
  "type": "INLINE_EDIT_REQUEST",
  "instruction": "Improve error handling",
  "selectedCode": "function example() {}"
}
```

### AGENT_MODE_CHANGED

Conceptual payload:

```json
{
  "type": "AGENT_MODE_CHANGED",
  "enabled": true
}
```

## Extension Host → Webview

| Message | Purpose |
|---|---|
| `MESSAGE_RECEIVED` | Delivers assistant or user message content |
| `STATUS_UPDATE` | Updates runtime status |
| `ERROR` | Communicates request failures |
| `CHAT_CLEARED` | Communicates a fresh conversation ID |

### MESSAGE_RECEIVED

Conceptual payload:

```json
{
  "type": "MESSAGE_RECEIVED",
  "messageId": "message-id",
  "role": "assistant",
  "content": "Here is the explanation...",
  "timestamp": 0
}
```

### STATUS_UPDATE

Conceptual payload:

```json
{
  "type": "STATUS_UPDATE",
  "status": "working"
}
```

### ERROR

Conceptual payload:

```json
{
  "type": "ERROR",
  "message": "Request failed"
}
```

### CHAT_CLEARED

Conceptual payload:

```json
{
  "type": "CHAT_CLEARED",
  "newConversationId": "new-conversation-id"
}
```

These JSON examples illustrate the communication concepts. The actual TypeScript interfaces in the source code remain authoritative.

### Connection Status Values

```text
not-connected
connecting
ready
working
error
```

A `ready` state should only be reported after the runtime has actually confirmed the connection.

---

# 17. Project Structure

```text
ForgePilot/
│
├── .vscode/
│   └── launch.json
│
├── src/
│   │
│   ├── extension.ts
│   │
│   ├── commands/
│   │   ├── openForgePilot.ts
│   │   ├── newChat.ts
│   │   └── clearChat.ts
│   │
│   ├── providers/
│   │   └── ForgePilotViewProvider.ts
│   │
│   ├── services/
│   │   ├── MessageService.ts
│   │   ├── PromptService.ts
│   │   ├── StreamingService.ts
│   │   ├── TrueForgeSessionService.ts
│   │   ├── ConnectionService.ts
│   │   └── StateService.ts
│   │
│   ├── types/
│   │   ├── messages.ts
│   │   └── trueforge.ts
│   │
│   ├── test/
│   │   ├── MessageService.test.ts
│   │   ├── PromptService.test.ts
│   │   ├── StreamingService.test.ts
│   │   ├── TrueForgeSessionService.test.ts
│   │   └── ConversationId.test.ts
│   │
│   └── webview/
│       ├── index.html
│       ├── styles.css
│       └── script.js
│
├── media/
│   └── icons/
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

---

# 18. Development Workflow

ForgePilot follows a modular development approach.

### Source Code

Application logic is maintained in the `src` directory.

### TypeScript Compilation

```bash
npm run compile
```

### Automated Testing

```bash
npm test
```

### Webview JavaScript Validation

```bash
node --check src/webview/script.js
```

### Git Workflow

Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

Review modifications:

```bash
git status
git diff
```

Run tests before committing:

```bash
npm test
```

Commit changes:

```bash
git add .
git commit -m "feat: describe your changes"
```

Push the branch:

```bash
git push origin feature/your-feature-name
```

Submit a pull request for review.

---

# 19. Testing and Verification

ForgePilot includes automated tests using the Node.js built-in test runner.

The test suite covers:

| Test Area | Coverage |
|---|---|
| Message Service | Conversation ID validation and message routing |
| Prompt Service | Chat, Agent, and Inline Edit prompt construction |
| Streaming Service | Delta processing, completion, errors, cancellation |
| Session Service | Conversation reset and session management |
| Conversation IDs | Synchronization and stale request rejection |

### Run Tests

```bash
npm test
```

### Latest Local Verification Results

| Check | Result |
|---|---|
| `npm ci` | Passed |
| `npm run compile` | Passed |
| `npm test` | 18 passed |
| Failed tests | 0 |
| Webview syntax check | Passed |
| npm audit | 0 vulnerabilities |

These results reflect the latest local verification run and should not be interpreted as proof of successful live TrueForge connectivity.

### Manual Testing Checklist

| Test | Expected Result |
|---|---|
| Launch Extension Development Host | ForgePilot extension loads |
| Open ForgePilot sidebar | Interface appears |
| Send a chat prompt | Message reaches the runtime |
| Receive response | Assistant response appears |
| Test streaming | Response is displayed incrementally |
| Start New Chat | Fresh conversation is created |
| Clear Chat | Current conversation is reset |
| Toggle Agent Mode | Agent-specific instructions are used |
| Submit Inline Edit | Explicit selected code is included |
| Cancel request | Active request is cancelled |
| Reopen Webview | Conversation state is restored |
| Test invalid credentials | Clear error is displayed |

---

# 20. Security and Reliability

Security and reliability are important parts of the ForgePilot architecture.

Current design considerations:

- Validate incoming Webview messages.
- Reject stale conversation requests.
- Keep runtime communication inside the Extension Host.
- Use secure credential storage for access tokens.
- Avoid exposing credentials through logs or Webview messages.
- Handle runtime errors and request cancellation.
- Avoid claiming successful connection without runtime confirmation.

Developers should never commit API keys, access tokens, passwords, or other secrets to the repository.

---

# 21. Current Limitations

ForgePilot is actively under development.

The following limitations should be considered when evaluating the current implementation:

1. Live TrueForge server connectivity has not yet been independently verified through a complete end-to-end test.
2. Agent Mode currently provides structured recommendations and does not independently execute development tools.
3. Inline Edit generates modification proposals but does not automatically apply them to workspace files.
4. Clearing local conversation mappings does not necessarily delete server-side sessions.
5. Automated unit tests do not replace full manual UI and integration testing.
6. External runtime availability and valid authentication are required for real AI interactions.

---

# 22. Roadmap

## Phase 1 — VS Code Extension Foundation

- [x] VS Code extension foundation.
- [x] Activity Bar integration.
- [x] Sidebar interface.
- [x] Chat interface.
- [x] Agent Mode interface.
- [x] Inline Edit interface.
- [x] Typed message contract.
- [x] Webview communication bridge.

## Phase 2 — TrueForge Runtime Integration

- [x] TrueForge SDK integration.
- [x] Runtime-backed message handling.
- [x] Prompt Service.
- [x] Streaming Service.
- [x] TrueForge Session Service.
- [x] Chat and Agent Mode prompt separation.
- [x] Inline Edit code context.
- [x] Conversation ID synchronization.
- [x] Request cancellation.
- [x] Error propagation.
- [x] Automated unit tests.

## Phase 3 — Advanced Engineering Capabilities

- [ ] Verified live runtime integration.
- [ ] Autonomous engineering tool execution.
- [ ] Repository-aware context retrieval.
- [ ] Safe workspace modifications.
- [ ] Inline Edit application and diff review.
- [ ] Multi-step engineering workflows.
- [ ] Advanced debugging assistance.
- [ ] Expanded UI and integration testing.

## Phase 4 — Engineering Teammate Platform

- [ ] Specialized engineering agents.
- [ ] Architecture and planning workflows.
- [ ] Code review assistance.
- [ ] Testing and debugging workflows.
- [ ] Improved project-level context.
- [ ] Advanced developer productivity features.

Future phases represent planned development, not currently completed functionality.

---

# 23. Contributing

Contributions, bug reports, and feature suggestions are welcome.

### Contribution Guidelines

1. Fork the repository.
2. Create a dedicated feature branch.
3. Keep changes focused and modular.
4. Follow the existing architecture.
5. Add tests for new functionality.
6. Run compilation and automated tests.
7. Document relevant limitations.
8. Submit a pull request with a clear explanation.

### Before Submitting a Pull Request

```bash
npm ci
npm run compile
npm test
node --check src/webview/script.js
```

Please include relevant verification results in your pull request.

---

# 24. License

License information should be added to the repository before distributing ForgePilot under an open-source license.

---

## Project Information

**Project:** ForgePilot  
**Category:** AI Developer Tools / VS Code Extension  
**Runtime:** TrueForge  
**Repository:** https://github.com/aditidange29-git/ForgePilot  
**Development Status:** Active Development

---

<p align="center">
  <strong>ForgePilot — Your AI Engineering Teammate, right inside VS Code.</strong>
</p>

<p align="center">
  Built to make software development more intelligent, contextual, and collaborative.
</p>
