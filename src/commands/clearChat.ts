import { MessageService } from "../services/MessageService.js";

/**
 * Clears the current conversation and starts a fresh TrueForge session on demand.
 */
export function clearChat(messageService: MessageService): void {
  messageService.handleMessage({ type: "CLEAR_CHAT" });
}
