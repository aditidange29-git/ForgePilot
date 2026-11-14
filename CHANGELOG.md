# Changelog

## [Unreleased] — TrueForge Agent Runtime

### Added
- Pinned TrueForge SDK client with configurable server URL and secure optional token storage
- Confirmed server connectivity and retry/reconnect command
- Persistent TrueForge sessions per ForgePilot conversation
- Mode-specific backend instructions for Chat Mode and Agent Mode recommendations
- SDK metadata-aware streaming, delta merging, root-thread filtering, cancellation, and visible errors
- Fresh conversation and session mapping when clearing or starting a chat
- Conversation ID handshake and stale-message rejection
- Explicit Inline Edit code context; normal chat sends no editor selection
- Node.js 22 SDK compatibility and ESM extension output

## [0.1.0] — Phase 1 Foundation

### Added
- VS Code extension activation and deactivation
- ForgePilot activity bar icon and sidebar
- Chat interface with user and assistant message bubbles
- Empty, loading, and error states
- Multiline message input (Enter to send, Shift+Enter for newline)
- New Chat and Clear Chat commands
- Agent Mode toggle
- Inline Edit panel
- Connection status badge (not-connected / connecting / ready / working / error)
- Typed Webview ↔ Extension Host message contract (`src/types/messages.ts`)
- Secure Webview with CSP, nonce, and `asWebviewUri` resource loading
- Message validation in MessageService
- README with runtime setup and connection notes
