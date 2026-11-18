import * as vscode from "vscode";
import { ConnectionStatus, ChatMessage, ChatMode } from "../types/messages.js";

const CONVERSATION_ID_KEY = "forgepilot.conversationId";

/**
 * StateService — single source of truth for extension-host state.
 */
export class StateService {
  private _status: ConnectionStatus = "not-connected";
  private _mode: ChatMode = "chat";
  private _conversationId: string;
  private _messages: ChatMessage[] = [];

  constructor(private readonly storage?: vscode.Memento) {
    const storedConversationId = storage?.get<unknown>(CONVERSATION_ID_KEY);
    this._conversationId =
      typeof storedConversationId === "string" && storedConversationId.length > 0
        ? storedConversationId
        : this._generateId();
    this._persistConversationId();
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

  appendMessageContent(messageId: string, delta: string): void {
    const message = this._messages.find((item) => item.id === messageId);
    if (message) {
      message.content += delta;
    }
  }

  newConversation(): string {
    this._conversationId = this._generateId();
    this._messages = [];
    this._persistConversationId();
    return this._conversationId;
  }

  clearMessages(): void {
    this._messages = [];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private _generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private _persistConversationId(): void {
    if (!this.storage) {
      return;
    }
    void this.storage
      .update(CONVERSATION_ID_KEY, this._conversationId)
      .then(undefined, (error: unknown) =>
        console.error("[ForgePilot] Could not persist conversation ID:", error)
      );
  }
}
