import type * as vscode from "vscode";
import {
  WebviewMessage,
  ExtensionMessage,
  ChatMessage,
  ConnectionStatus,
  isCurrentConversationId,
} from "../types/messages.js";
import { getErrorMessage } from "../types/trueforge.js";
import type { ActiveRequest } from "../types/trueforge.js";
import type { ConnectionService } from "./ConnectionService.js";
import {
  buildChatPrompt,
  buildInlineEditPrompt,
  EditorSelectionProvider,
} from "./PromptService.js";
import type { StateService } from "./StateService.js";
import type { StreamingService } from "./StreamingService.js";
import type { TrueForgeClientService } from "./TrueForgeClient.js";
import type { TrueForgeSessionService } from "./TrueForgeSessionService.js";

export class MessageService {
  private _webview: vscode.Webview | undefined;
  private _activeRequest: ActiveRequest | undefined;
  private _activeTask: Promise<void> | undefined;

  constructor(
    private readonly state: StateService,
    private readonly clientService: TrueForgeClientService,
    private readonly connectionService: ConnectionService,
    private readonly sessionService: TrueForgeSessionService,
    private readonly streamingService: StreamingService,
    private readonly editorSelection: EditorSelectionProvider
  ) {}

  setWebview(webview: vscode.Webview): void {
    this._webview = webview;
  }

  handleMessage(raw: unknown): void {
    if (!this._isValidMessage(raw)) {
      console.warn("[ForgePilot] Received invalid Webview message.");
      return;
    }

    switch (raw.type) {
      case "WEBVIEW_READY":
        this._syncConversation();
        void this.reconnect();
        break;
      case "INLINE_CONTEXT_REQUEST":
        this._sendInlineContext();
        break;
      case "SEND_MESSAGE":
        this._handleSendMessage(raw.payload);
        break;
      case "NEW_CHAT":
      case "CLEAR_CHAT":
        this._resetConversation();
        break;
      case "CANCEL_REQUEST":
        this._cancelRequest();
        break;
      case "INLINE_EDIT_REQUEST":
        this._handleInlineEdit(raw.payload);
        break;
      case "AGENT_MODE_CHANGED":
        this.state.setMode(raw.payload.enabled ? "agent" : "chat");
        break;
    }
  }

  sendToWebview(msg: ExtensionMessage): void {
    this._webview?.postMessage(msg);
  }

  sendStatus(status: ConnectionStatus): void {
    this.state.setStatus(status);
    this.sendToWebview({ type: "STATUS_UPDATE", payload: { status } });
  }

  async reconnect(): Promise<void> {
    try {
      await this.connectionService.connect();
    } catch (error) {
      this.sendError(getErrorMessage(error));
    }
  }

  resetConnection(): void {
    this.clientService.reset();
    this.connectionService.markDisconnected();
    void this.reconnect();
  }

  private _handleSendMessage(payload: {
    message: string;
    conversationId: string;
    mode: "chat" | "agent";
  }): void {
    const message = payload.message.trim();
    if (!message || this._activeRequest) {
      return;
    }
    if (
      !isCurrentConversationId(payload.conversationId, this.state.conversationId)
    ) {
      this._syncConversation();
      this.sendError("The conversation changed. Your message was not sent; please retry.");
      return;
    }

    this.state.setMode(payload.mode);
    this._addMessage("user", message);
    this._startPrompt(
      buildChatPrompt(message),
      payload.conversationId,
      payload.mode
    );
  }

  private _handleInlineEdit(payload: {
    instruction: string;
    selectedCode?: string;
  }): void {
    const instruction = payload.instruction.trim();
    if (!instruction || this._activeRequest) {
      return;
    }

    const selection = this.editorSelection.getSelection();
    const selectedCode = selection.code || payload.selectedCode?.trim() || "";
    if (!selectedCode) {
      this.sendError("Select code in the editor before submitting an inline edit.");
      return;
    }

    this._addMessage("user", instruction);
    this._startPrompt(
      buildInlineEditPrompt(
        instruction,
        selectedCode,
        selection.languageId
      ),
      this.state.conversationId,
      this.state.mode
    );
  }

  private _startPrompt(
    prompt: string,
    conversationId: string,
    mode: "chat" | "agent"
  ): void {
    if (this._activeRequest) {
      return;
    }

    const active: ActiveRequest = {
      controller: new AbortController(),
      conversationId,
    };
    this._activeRequest = active;
    const task = this._runPrompt(active, prompt, mode);
    this._activeTask = task;
    void task.then(() => {
      if (this._activeTask === task) {
        this._activeTask = undefined;
      }
    });
  }

  private async _runPrompt(
    active: ActiveRequest,
    prompt: string,
    mode: "chat" | "agent"
  ): Promise<void> {
    try {
      const client = await this.connectionService.connect(
        active.controller.signal
      );
      this.sendStatus("working");
      const sessionId = await this.sessionService.getOrCreateSession(
        active.conversationId,
        client,
        active.controller.signal,
        mode
      );
      active.sessionId = sessionId;

      let assistantMessageId: string | undefined;
      let responseText = "";
      const addDelta = (delta: string): void => {
        if (
          active.controller.signal.aborted ||
          this.state.conversationId !== active.conversationId
        ) {
          return;
        }
        if (!assistantMessageId) {
          assistantMessageId = this._addMessage("assistant", "");
        }
        responseText += delta;
        this.state.appendMessageContent(assistantMessageId, delta);
        this.sendToWebview({
          type: "MESSAGE_DELTA",
          payload: { messageId: assistantMessageId, delta },
        });
      };

      active.turnStarted = true;
      const result = await this.streamingService.streamTurn(
        client,
        sessionId,
        prompt,
        active.controller.signal,
        addDelta
      );
      active.turnStarted = false;

      if (
        result === "done" &&
        !responseText &&
        this.state.conversationId === active.conversationId
      ) {
        this._addMessage(
          "assistant",
          "TrueForge completed the turn without a text response."
        );
      }

      this.sendStatus(
        this.connectionService.isConnected ? "ready" : "not-connected"
      );
    } catch (error) {
      if (active.controller.signal.aborted) {
        this.sendStatus(
          this.connectionService.isConnected ? "ready" : "not-connected"
        );
      } else {
        if (this.state.conversationId === active.conversationId) {
          this.sendError(getErrorMessage(error));
        }
        this.sendStatus("error");
      }
    } finally {
      if (this._activeRequest === active) {
        this._activeRequest = undefined;
      }
    }
  }

  private _cancelRequest(): void {
    const active = this._activeRequest;
    if (!active) {
      return;
    }

    active.controller.abort();
    if (active.sessionId && active.turnStarted) {
      void this._cancelRemoteTurn(active.sessionId, active.conversationId);
    }
  }

  private async _cancelRemoteTurn(
    sessionId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const client = await this.clientService.getClient();
      await client.sessions.cancel(sessionId);
    } catch (error) {
      if (this.state.conversationId === conversationId) {
        this.sendError(
          `Could not confirm cancellation with TrueForge: ${getErrorMessage(error)}`
        );
        this.sendStatus("error");
      } else {
        console.error("[ForgePilot] Could not confirm cancellation:", error);
      }
    }
  }

  private _resetConversation(): void {
    const oldConversationId = this.state.conversationId;
    const activeTask = this._activeTask;
    this._cancelRequest();
    const newConversationId = this.state.newConversation();
    this._syncConversation(newConversationId);
    void this._removeOldSession(oldConversationId, activeTask);
  }

  private async _removeOldSession(
    conversationId: string,
    activeTask: Promise<void> | undefined
  ): Promise<void> {
    try {
      if (activeTask) {
        await activeTask;
      }
      await this.sessionService.removeSession(conversationId);
    } catch (error) {
      this.sendError(
        `The old TrueForge session mapping could not be cleared: ${getErrorMessage(error)}`
      );
    }
  }

  private _syncConversation(conversationId = this.state.conversationId): void {
    let status: ConnectionStatus;
    if (this.connectionService.isConnected) {
      status = this.state.status === "error" ? "error" : "ready";
    } else {
      status =
        this.state.status === "error" || this.state.status === "connecting"
          ? this.state.status
          : "not-connected";
    }
    this.sendToWebview({
      type: "CHAT_CLEARED",
      payload: {
        newConversationId: conversationId,
        messages: this.state.messages,
        mode: this.state.mode,
        status,
      },
    });
  }

  private _addMessage(role: "user" | "assistant", content: string): string {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: Date.now(),
    };
    this.state.addMessage(message);
    this.sendToWebview({
      type: "MESSAGE_RECEIVED",
      payload: {
        messageId: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      },
    });
    return message.id;
  }

  private _sendInlineContext(): void {
    this.sendToWebview({
      type: "INLINE_CONTEXT",
      payload: { selectedCode: this.editorSelection.getSelection().code },
    });
  }

  private sendError(message: string): void {
    this.sendToWebview({ type: "ERROR", payload: { message } });
  }

  private _isValidMessage(raw: unknown): raw is WebviewMessage {
    if (typeof raw !== "object" || raw === null) {
      return false;
    }

    const message = raw as Record<string, unknown>;
    switch (message.type) {
      case "WEBVIEW_READY":
      case "INLINE_CONTEXT_REQUEST":
      case "NEW_CHAT":
      case "CLEAR_CHAT":
      case "CANCEL_REQUEST":
        return true;
      case "SEND_MESSAGE": {
        const payload = message.payload as Record<string, unknown> | undefined;
        return (
          typeof payload?.message === "string" &&
          typeof payload.conversationId === "string" &&
          (payload.mode === "chat" || payload.mode === "agent")
        );
      }
      case "INLINE_EDIT_REQUEST": {
        const payload = message.payload as Record<string, unknown> | undefined;
        return (
          typeof payload?.instruction === "string" &&
          (payload.selectedCode === undefined ||
            typeof payload.selectedCode === "string")
        );
      }
      case "AGENT_MODE_CHANGED": {
        const payload = message.payload as Record<string, unknown> | undefined;
        return typeof payload?.enabled === "boolean";
      }
      default:
        return false;
    }
  }
}
