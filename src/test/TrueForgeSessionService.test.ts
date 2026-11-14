import assert from "node:assert/strict";
import test from "node:test";
import type * as vscode from "vscode";
import { TrueForgeApi } from "@truefoundry/trueforge-sdk";
import { StateService } from "../services/StateService.js";
import { TrueForgeSessionService } from "../services/TrueForgeSessionService.js";
import type { TrueForgeClient } from "../types/trueforge.js";

class MemoryMemento {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.values.has(key)
      ? (this.values.get(key) as T)
      : defaultValue;
  }

  keys(): readonly string[] {
    return [...this.values.keys()];
  }

  async update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }
}

function createFakeClient(): {
  client: TrueForgeClient;
  creates: TrueForgeApi.CreateSessionRequest[];
  updates: Array<{
    sessionId: string;
    request: TrueForgeApi.UpdateSessionRequest;
  }>;
} {
  let nextSession = 0;
  const creates: TrueForgeApi.CreateSessionRequest[] = [];
  const updates: Array<{
    sessionId: string;
    request: TrueForgeApi.UpdateSessionRequest;
  }> = [];
  const client = {
    models: {
      list: async () => ({ data: [{ name: "configured/provider-model" }] }),
    },
    sessions: {
      create: async (request: TrueForgeApi.CreateSessionRequest) => {
        creates.push(request);
        nextSession += 1;
        return { data: { id: `session-${nextSession}` } };
      },
      update: async (
        sessionId: string,
        request: TrueForgeApi.UpdateSessionRequest
      ) => {
        updates.push({ sessionId, request });
        return { data: { id: sessionId } };
      },
    },
  };

  return {
    client: client as unknown as TrueForgeClient,
    creates,
    updates,
  };
}

test("each mode is sent in the inline TrueForge agent specification", async () => {
  const storage = new MemoryMemento();
  const sessions = new TrueForgeSessionService(storage as vscode.Memento);
  const fake = createFakeClient();
  const signal = new AbortController().signal;

  const sessionId = await sessions.getOrCreateSession(
    "conversation-a",
    fake.client,
    signal,
    "chat"
  );
  await sessions.getOrCreateSession(
    "conversation-a",
    fake.client,
    signal,
    "agent"
  );

  assert.equal(fake.creates.length, 1);
  assert.ok("spec" in fake.creates[0].agent);
  assert.equal(fake.creates[0].agent.spec?.model.name, "configured/provider-model");
  assert.match(fake.creates[0].agent.spec?.instructions ?? "", /Chat Mode/);
  assert.equal(fake.updates.length, 1);
  assert.equal(fake.updates[0].sessionId, sessionId);
  assert.match(
    fake.updates[0].request.agent?.spec.instructions ?? "",
    /Agent Mode/
  );
});

test("resetting a conversation removes its mapping and creates a fresh session", async () => {
  const storage = new MemoryMemento();
  const state = new StateService(storage as vscode.Memento);
  const sessions = new TrueForgeSessionService(storage as vscode.Memento);
  const fake = createFakeClient();
  const signal = new AbortController().signal;
  const oldConversationId = state.conversationId;

  const oldSessionId = await sessions.getOrCreateSession(
    oldConversationId,
    fake.client,
    signal,
    "chat"
  );
  const newConversationId = state.newConversation();
  await sessions.removeSession(oldConversationId);
  const newSessionId = await sessions.getOrCreateSession(
    newConversationId,
    fake.client,
    signal,
    "chat"
  );

  assert.notEqual(newConversationId, oldConversationId);
  assert.notEqual(newSessionId, oldSessionId);
  assert.equal(fake.creates.length, 2);
  assert.equal(
    storage.get<Record<string, string>>("forgepilot.trueforge.sessions")?.[
      oldConversationId
    ],
    undefined
  );

  const reopenedSessions = new TrueForgeSessionService(
    storage as vscode.Memento
  );
  const reopenedSessionId = await reopenedSessions.getOrCreateSession(
    newConversationId,
    fake.client,
    signal,
    "agent"
  );
  assert.equal(reopenedSessionId, newSessionId);
  assert.equal(fake.creates.length, 2);
});
