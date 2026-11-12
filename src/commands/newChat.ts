import { MessageService } from "../services/MessageService";

/**
 * Triggers a new conversation — clears history and generates a new ID.
 */
export function newChat(messageService: MessageService): void {
  messageService.handleMessage({ type: "NEW_CHAT" });
}
