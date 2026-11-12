import * as vscode from "vscode";
import {
  WebviewMessage,
  ExtensionMessage,
  ChatMessage,
  ConnectionStatus,
} from "../types/messages";
import { StateService } from "./StateService";

const PLACEHOLDER_RESPONSE =
  "ForgePilot agent connection is not configured yet. " +
  "AI execution will be available in a later development phase.";

/**
 * MessageService — handles all message routing between the Webview and
 * the extension host.  Phase 2 replaces the placeholder response logic
 * with real TrueForge calls without touching the message contract.
 */
export class MessageService {
  private _webview: vscode.Webview | undefined;

  constructor(private readonly state: StateService) {}

  // ── Registration ──────────────────────────────────────────────────────────

  setWebview(webview: vscode.Webview): void {
    this._webview = webview;
  }

  // ── Inbound (Webview → Host) ──────────────────────────────────────────────

  handleMessage(raw: unknown): void {
    if (!this._isValidMessage(raw)) {
      console.warn("[ForgePilot] Received invalid message payload:", raw);
      return;
    }

    const msg = raw as WebviewMessage;

    switch (msg.type) {
      case "SEND_MESSAGE":
        this._handleSendMessage(msg.payload);
        break;
      case "NEW_CHAT":
        this._handleNewChat();
        break;
      case "CLEAR_CHAT":
        this._handleClearChat();
        break;
      case "CANCEL_REQUEST":
        // Phase 2: cancel in-flight TrueForge request
        break;
      case "INLINE_EDIT_REQUEST":
        this._handleInlineEdit(msg.payload);
        break;
      case "AGENT_MODE_CHANGED":
        this.state.setMode(msg.payload.enabled ? "agent" : "chat");
        break;
    }
  }

  // ── Outbound (Host → Webview) ─────────────────────────────────────────────

  sendToWebview(msg: ExtensionMessage): void {
    this._webview?.postMessage(msg);
  }

  sendStatus(status: ConnectionStatus): void {
    this.state.setStatus(status);
    this.sendToWebview({ type: "STATUS_UPDATE", payload: { status } });
  }

  // ── Private handlers ──────────────────────────────────────────────────────

  private _handleSendMessage(payload: {
    message: string;
    conversationId: string;
    mode: "chat" | "agent";
  }): void {
    if (!payload.message?.trim()) {
      return;
    }

    // Echo user message back so the UI stays consistent
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: payload.message.trim(),
      timestamp: Date.now(),
    };
    this.state.addMessage(userMsg);
    this.sendToWebview({
      type: "MESSAGE_RECEIVED",
      payload: {
        messageId: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        timestamp: userMsg.timestamp,
      },
    });

    // Phase 1 placeholder — Phase 2 replaces this block with TrueForge call
    this.sendStatus("working");
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: PLACEHOLDER_RESPONSE,
        timestamp: Date.now(),
      };
      this.state.addMessage(assistantMsg);
      this.sendToWebview({
        type: "MESSAGE_RECEIVED",
        payload: {
          messageId: assistantMsg.id,
          role: assistantMsg.role,
          content: assistantMsg.content,
          timestamp: assistantMsg.timestamp,
        },
      });
      this.sendStatus("not-connected");
    }, 400);
  }

  private _handleNewChat(): void {
    const newId = this.state.newConversation();
    this.sendToWebview({
      type: "CHAT_CLEARED",
      payload: { newConversationId: newId },
    });
  }

  private _handleClearChat(): void {
    this.state.clearMessages();
    this.sendToWebview({
      type: "CHAT_CLEARED",
      payload: { newConversationId: this.state.conversationId },
    });
  }

  private _handleInlineEdit(payload: {
    instruction: string;
    selectedCode?: string;
  }): void {
    // Phase 2: wire to TrueForge inline edit API
    this.sendToWebview({
      type: "ERROR",
      payload: {
        message:
          "Inline edit is not available in Phase 1. " +
          "TrueForge integration will be added in Phase 2.",
      },
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private _isValidMessage(raw: unknown): raw is WebviewMessage {
    if (typeof raw !== "object" || raw === null) {
      return false;
    }
    const obj = raw as Record<string, unknown>;
    const validTypes = [
      "SEND_MESSAGE",
      "NEW_CHAT",
      "CLEAR_CHAT",
      "CANCEL_REQUEST",
      "INLINE_EDIT_REQUEST",
      "AGENT_MODE_CHANGED",
    ];
    return typeof obj["type"] === "string" && validTypes.includes(obj["type"]);
  }
}
