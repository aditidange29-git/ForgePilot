/**
 * ForgePilot Message Contract — Phase 2
 *
 * These types define ALL communication between the Webview UI and the
 * VS Code Extension Host. Phase 2 must use this contract when wiring
 * the TrueForge runtime; do NOT change message shapes without updating
 * both sides and bumping the version comment below.
 *
 * Contract version: 1.1.0
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
    }
  | {
      /** Webview is ready to receive extension-host messages */
      type: "WEBVIEW_READY";
    }
  | {
      /** Webview requests the current VS Code editor selection */
      type: "INLINE_CONTEXT_REQUEST";
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
      /** Incremental text for an existing assistant message */
      type: "MESSAGE_DELTA";
      payload: {
        messageId: string;
        delta: string;
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
        messages: ChatMessage[];
        mode: ChatMode;
        status: ConnectionStatus;
      };
    }
  | {
      /** Current editor selection shown in the Inline Edit panel */
      type: "INLINE_CONTEXT";
      payload: {
        selectedCode: string;
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

export function isCurrentConversationId(
  messageConversationId: string,
  activeConversationId: string
): boolean {
  return (
    activeConversationId.length > 0 &&
    messageConversationId === activeConversationId
  );
}
