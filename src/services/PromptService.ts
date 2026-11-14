import type { ChatMode } from "../types/messages.js";

export interface EditorSelection {
  code: string;
  fileName: string;
  languageId: string;
}

export interface EditorSelectionProvider {
  getSelection(): EditorSelection;
}

export function getModeInstructions(mode: ChatMode): string {
  if (mode === "agent") {
    return (
      "You are ForgePilot in Agent Mode. Give structured engineering analysis, " +
      "break work into actionable steps, and recommend a solution. This integration " +
      "does not grant workspace editing or command execution; never claim to have " +
      "modified files or run tools."
    );
  }

  return (
    "You are ForgePilot in Chat Mode. Answer the user's software engineering " +
    "questions directly and concisely. Do not claim to have modified files or run tools."
  );
}

export function buildChatPrompt(message: string): string {
  return message.trim();
}

export function buildInlineEditPrompt(
  instruction: string,
  selectedCode: string,
  languageId: string
): string {
  return (
    "Apply this requested edit to the selected code. Explain the change and provide the complete revised code.\n\n" +
    `Instruction:\n${instruction.trim()}\n\nSelected code:\n\`\`\`${languageId}\n${selectedCode}\n\`\`\``
  );
}
