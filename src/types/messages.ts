/**
 * ForgePilot Message Contract — Phase 1
 *
 * These types define ALL communication between the Webview UI and the
 * VS Code Extension Host. Phase 2 must use this contract when wiring
 * the TrueForge runtime; do NOT change message shapes without updating
 * both sides and bumping the version comment below.
 *
 * Contract version: 1.0.0
 */

// ---------------------------------------------------------------------------
// Messages sent FROM the Webview TO the Extension Host
// ---------------------------------------------------------------------------

export type WebviewMessage =
  | {
      /** User submitted a chat message */
      type: "SEND_MESSAGE";
      payload: {
        message: string;
        conversationId: string;
        mode: "chat" | "agent";
      };
    }
  | {
      /** User requested a new conversation */
      type: "NEW_CHAT";
    }
  | {
      /** User cleared the current conversation */
      type: "CLEAR_CHAT";
    }
  | {
      /** User cancelled an in-flight request */
      type: "CANCEL_REQUEST";
    }
  | {
      /** User submitted an inline edit instruction */
      type: "INLINE_EDIT_REQUEST";
      payload: {
        instruction: string;
        /** Code selected in the editor — populated by Phase 2 */
        selectedCode?: string;
      };
    }
  | {
      /** Webview reports Agent Mode state change */
      type: "AGENT_MODE_CHANGED";
      payload: {
        enabled: boolean;
      };
    };

// ---------------------------------------------------------------------------
// Messages sent FROM the Extension Host TO the Webview
// ---------------------------------------------------------------------------

export type ExtensionMessage =
  | {
      /** A message (user echo or assistant reply) to render */
      type: "MESSAGE_RECEIVED";
      payload: {
        messageId: string;
        role: "user" | "assistant";
        content: string;
        timestamp: number;
      };
    }
  | {
      /** Connection / processing state update */
      type: "STATUS_UPDATE";
      payload: {
        status: ConnectionStatus;
      };
    }
  | {
      /** An error occurred */
      type: "ERROR";
      payload: {
        message: string;
      };
    }
  | {
      /** Extension host confirms a NEW_CHAT reset */
      type: "CHAT_CLEARED";
      payload: {
        newConversationId: string;
      };
    };

// ---------------------------------------------------------------------------
// Shared value types
// ---------------------------------------------------------------------------

export type ConnectionStatus =
  | "not-connected"
  | "connecting"
  | "ready"
  | "working"
  | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ChatMode = "chat" | "agent";
