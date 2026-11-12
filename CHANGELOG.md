# Changelog

## [0.1.0] — Phase 1 Foundation

### Added
- VS Code extension activation and deactivation
- ForgePilot activity bar icon and sidebar
- Chat interface with user and assistant message bubbles
- Empty, loading, and error states
- Multiline message input (Enter to send, Shift+Enter for newline)
- New Chat and Clear Chat commands
- Agent Mode toggle (UI state only — Phase 2 wires execution)
- Inline Edit panel (UI only — Phase 2 wires TrueForge)
- Connection status badge (not-connected / connecting / ready / working / error)
- Typed Webview ↔ Extension Host message contract (`src/types/messages.ts`)
- Secure Webview with CSP, nonce, and `asWebviewUri` resource loading
- Message validation in MessageService
- README with Phase 2 integration notes
