import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChatPrompt,
  buildInlineEditPrompt,
  getModeInstructions,
} from "../services/PromptService.js";

test("Chat Mode sends only the typed prompt", () => {
  const prompt = buildChatPrompt("  Explain this function.  ");

  assert.equal(prompt, "Explain this function.");
  assert.equal(prompt.includes("selected code"), false);
});

test("Inline Edit includes only its explicit code context", () => {
  const prompt = buildInlineEditPrompt(
    "Add input validation",
    "function save() {}",
    "typescript"
  );

  assert.match(prompt, /Instruction:\nAdd input validation/);
  assert.match(prompt, /```typescript\nfunction save\(\) \{\}\n```/);
});

test("Agent Mode asks for structured recommendations without claiming tools", () => {
  const chatInstructions = getModeInstructions("chat");
  const agentInstructions = getModeInstructions("agent");

  assert.notEqual(agentInstructions, chatInstructions);
  assert.match(agentInstructions, /structured engineering analysis/);
  assert.match(agentInstructions, /never claim/);
  assert.doesNotMatch(agentInstructions, /autonomously edit/);
});
