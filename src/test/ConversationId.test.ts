import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentConversationId } from "../types/messages.js";

test("only the synchronized conversation ID is accepted", () => {
  assert.equal(isCurrentConversationId("conversation-a", "conversation-a"), true);
  assert.equal(isCurrentConversationId("conversation-b", "conversation-a"), false);
  assert.equal(isCurrentConversationId("", "conversation-a"), false);
  assert.equal(isCurrentConversationId("conversation-a", ""), false);
});
