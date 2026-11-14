import assert from "node:assert/strict";
import test from "node:test";
import type * as vscode from "vscode";
import { MessageService } from "../services/MessageService.js";
import type { EditorSelectionProvider } from "../services/PromptService.js";
import type { ConnectionService } from "../services/ConnectionService.js";
import type { StateService } from "../services/StateService.js";
import type { StreamingService } from "../services/StreamingService.js";
import type { TrueForgeClientService } from "../services/TrueForgeClient.js";
import type { TrueForgeSessionService } from "../services/TrueForgeSessionService.js";
import type { TrueForgeClient } from "../types/trueforge.js";

interface PostedMessage {
  type: string;
  payload?: Record<string, unknown>;
}

interface TestContext {
  service: MessageService;
  conversationId: string;
  posted: PostedMessage[];
  prompts: string[];
  modes: string[];
  sessionMap: Map<string, string>;
  removed: string[];
  cancelCalls: string[];
  setStreaming(
    handler: (
      prompt: string,
      signal: AbortSignal,
      onDelta: (delta: string) => void
    ) => Promise<"done" | "cancelled">
  ): void;
}

function createContext(selection = "const unrelated = true;"): TestContext {
  const state = {
    conversationId: "conversation-current",
    mode: "chat" as "chat" | "agent",
    messages: [] as Array<{ id: string; role: string; content: string }>,
    setMode(mode: "chat" | "agent") {
      this.mode = mode;
    },
    setStatus() {},
    addMessage(message: { id: string; role: string; content: string }) {
      this.messages.push(message);
    },
    appendMessageContent(id: string, delta: string) {
      const message = this.messages.find((item) => item.id === id);
      if (message) {
        message.content += delta;
      }
    },
    newConversation() {
      this.conversationId = `${this.conversationId}-next`;
      this.messages = [];
      return this.conversationId;
    },
  };
  const posted: PostedMessage[] = [];
  const prompts: string[] = [];
  const modes: string[] = [];
  const sessionMap = new Map<string, string>();
  const removed: string[] = [];
  const cancelCalls: string[] = [];
  let streamHandler: TestContext["setStreaming"] extends (
    handler: infer T
  ) => void
    ? T
    : never = async (prompt, _signal, onDelta) => {
    prompts.push(prompt);
    onDelta("reply");
    return "done";
  };

  const client = {
    sessions: {
      cancel: async (sessionId: string) => {
        cancelCalls.push(sessionId);
      },
    },
  } as unknown as TrueForgeClient;
  const clientService = {
    getClient: async () => client,
    reset() {},
  } as unknown as TrueForgeClientService;
  const connectionService = {
    connect: async () => client,
    get isConnected() {
      return true;
    },
    markDisconnected() {},
  } as unknown as ConnectionService;
  const sessionService = {
    getOrCreateSession: async (
      conversationId: string,
      _client: TrueForgeClient,
      _signal: AbortSignal,
      mode: "chat" | "agent"
    ) => {
      modes.push(mode);
      let sessionId = sessionMap.get(conversationId);
      if (!sessionId) {
        sessionId = `session-${conversationId}`;
        sessionMap.set(conversationId, sessionId);
      }
      return sessionId;
    },
    removeSession: async (conversationId: string) => {
      removed.push(conversationId);
      sessionMap.delete(conversationId);
    },
  } as unknown as TrueForgeSessionService;
  const streamingService = {
    streamTurn: async (
      _client: TrueForgeClient,
      _sessionId: string,
      prompt: string,
      signal: AbortSignal,
      onDelta: (delta: string) => void
    ) => streamHandler(prompt, signal, onDelta),
  } as unknown as StreamingService;
  const editorSelection: EditorSelectionProvider = {
    getSelection: () => ({
      code: selection,
      fileName: "unrelated.ts",
      languageId: "typescript",
    }),
  };
  const service = new MessageService(
    state as unknown as StateService,
    clientService,
    connectionService,
    sessionService,
    streamingService,
    editorSelection
  );
  service.setWebview({
    postMessage: (message: PostedMessage) => {
      posted.push(message);
      return Promise.resolve(true);
    },
  } as unknown as vscode.Webview);

  return {
    service,
    conversationId: state.conversationId,
    posted,
    prompts,
    modes,
    sessionMap,
    removed,
    cancelCalls,
    setStreaming(handler) {
      streamHandler = handler;
    },
  };
}

async function waitFor(
  context: TestContext,
  predicate: () => boolean
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Timed out waiting for the message service operation.");
}

test("synchronizes the Webview conversation ID and rejects stale sends", () => {
  const context = createContext();

  context.service.handleMessage({ type: "WEBVIEW_READY" });
  assert.equal(
    context.posted.find((message) => message.type === "CHAT_CLEARED")?.payload
      ?.newConversationId,
    context.conversationId
  );

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "do not send",
      conversationId: "stale-conversation",
      mode: "chat",
    },
  });

  assert.equal(context.prompts.length, 0);
  assert.equal(context.modes.length, 0);
  assert.equal(
    context.posted.some((message) => message.type === "ERROR"),
    true
  );
});

test("normal chat omits selected editor code and forwards Agent Mode", async () => {
  const context = createContext("SECRET_SELECTED_CODE");

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "Explain the architecture.",
      conversationId: context.conversationId,
      mode: "agent",
    },
  });

  await waitFor(context, () =>
    context.posted.some(
      (message) =>
        message.type === "STATUS_UPDATE" &&
        message.payload?.status === "ready"
    )
  );
  assert.deepEqual(context.prompts, ["Explain the architecture."]);
  assert.deepEqual(context.modes, ["agent"]);
  assert.equal(context.prompts[0].includes("SECRET_SELECTED_CODE"), false);
});

test("Inline Edit alone attaches selected editor code", async () => {
  const context = createContext("function save() {}");

  context.service.handleMessage({
    type: "INLINE_EDIT_REQUEST",
    payload: { instruction: "Add validation" },
  });

  await waitFor(context, () =>
    context.posted.some(
      (message) =>
        message.type === "STATUS_UPDATE" &&
        message.payload?.status === "ready"
    )
  );
  assert.match(context.prompts[0], /Add validation/);
  assert.match(context.prompts[0], /function save\(\) \{\}/);
});

test("Clear Chat changes the ID, removes the old mapping, and uses a fresh session", async () => {
  const context = createContext();
  const oldConversationId = context.conversationId;

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "first",
      conversationId: oldConversationId,
      mode: "chat",
    },
  });
  await waitFor(context, () => context.prompts.length === 1);
  context.service.handleMessage({ type: "CLEAR_CHAT" });

  const newConversationId = context.posted
    .filter((message) => message.type === "CHAT_CLEARED")
    .at(-1)?.payload?.newConversationId;
  assert.notEqual(newConversationId, oldConversationId);
  await waitFor(context, () => context.removed.includes(oldConversationId));

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "fresh",
      conversationId: String(newConversationId),
      mode: "chat",
    },
  });
  await waitFor(context, () => context.prompts.length === 2);

  assert.equal(context.sessionMap.has(oldConversationId), false);
  assert.equal(context.sessionMap.has(String(newConversationId)), true);
});

test("cancels the SDK stream and asks TrueForge to cancel the active session", async () => {
  const context = createContext();
  let streamStarted = false;
  context.setStreaming((_prompt, signal) => {
    streamStarted = true;
    return new Promise((resolve) => {
      signal.addEventListener(
        "abort",
        () => resolve("cancelled"),
        { once: true }
      );
    });
  });

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "long task",
      conversationId: context.conversationId,
      mode: "chat",
    },
  });
  await waitFor(context, () => streamStarted);
  context.service.handleMessage({ type: "CANCEL_REQUEST" });
  await waitFor(context, () => context.cancelCalls.length === 1);

  assert.deepEqual(context.cancelCalls, [`session-${context.conversationId}`]);
});

test("surfaces request failures to the Webview", async () => {
  const context = createContext();
  context.setStreaming(async () => {
    throw new Error("TrueForge turn failed");
  });

  context.service.handleMessage({
    type: "SEND_MESSAGE",
    payload: {
      message: "fail",
      conversationId: context.conversationId,
      mode: "chat",
    },
  });
  await waitFor(context, () =>
    context.posted.some(
      (message) =>
        message.type === "ERROR" &&
        message.payload?.message === "TrueForge turn failed"
    )
  );
});
