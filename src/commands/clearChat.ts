import { MessageService } from "../services/MessageService";

/**
 * Clears the current conversation messages without changing the conversation ID.
 */
export function clearChat(messageService: MessageService): void {
  messageService.handleMessage({ type: "CLEAR_CHAT" });
}
