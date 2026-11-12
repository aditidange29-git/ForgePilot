import { ConnectionStatus, ChatMessage, ChatMode } from "../types/messages";

/**
 * StateService — single source of truth for extension-host state.
 * Phase 2 will update `status` to "ready" once TrueForge connects.
 */
export class StateService {
  private _status: ConnectionStatus = "not-connected";
  private _mode: ChatMode = "chat";
  private _conversationId: string;
  private _messages: ChatMessage[] = [];

  constructor() {
    this._conversationId = this._generateId();
  }

  // ── Status ──────────────────────────────────────────────────────────────

  get status(): ConnectionStatus {
    return this._status;
  }

  setStatus(status: ConnectionStatus): void {
    this._status = status;
  }

  // ── Mode ────────────────────────────────────────────────────────────────

  get mode(): ChatMode {
    return this._mode;
  }

  setMode(mode: ChatMode): void {
    this._mode = mode;
  }

  // ── Conversation ─────────────────────────────────────────────────────────

  get conversationId(): string {
    return this._conversationId;
  }

  get messages(): ChatMessage[] {
    return [...this._messages];
  }

  addMessage(msg: ChatMessage): void {
    this._messages.push(msg);
  }

  newConversation(): string {
    this._conversationId = this._generateId();
    this._messages = [];
    return this._conversationId;
  }

  clearMessages(): void {
    this._messages = [];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private _generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
