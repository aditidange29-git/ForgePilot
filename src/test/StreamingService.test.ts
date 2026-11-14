import assert from "node:assert/strict";
import test from "node:test";
import { TrueForgeApi } from "@truefoundry/trueforge-sdk";
import { StreamingService } from "../services/StreamingService.js";
import type { TrueForgeClient } from "../types/trueforge.js";

interface StreamEvent {
  id?: string;
  data: TrueForgeApi.TurnStreamingEvent;
}

function modelDelta(
  id: string,
  threadId: string,
  content: string
): TrueForgeApi.ModelMessageDeltaEvent {
  return {
    id,
    threadId,
    content,
    type: "model.message.delta",
  };
}

function turnDone(
  status: "done" | "cancelled" | "error"
): TrueForgeApi.TurnDoneEvent {
  if (status === "cancelled") {
    return {
      id: "turn-done",
      createdAt: "2026-01-01T00:00:00Z",
      threadId: null,
      type: "turn.done",
      state: {
        completedAt: "2026-01-01T00:00:00Z",
        reason: TrueForgeApi.TurnStateCancelledReason.ClientCancelled,
        status,
      },
    };
  }
  if (status === "error") {
    return {
      id: "turn-done",
      createdAt: "2026-01-01T00:00:00Z",
      threadId: null,
      type: "turn.done",
      state: {
        completedAt: "2026-01-01T00:00:00Z",
        message: "Model request failed",
        status,
      },
    };
  }
  return {
    id: "turn-done",
    createdAt: "2026-01-01T00:00:00Z",
    threadId: null,
    type: "turn.done",
    state: {
      completedAt: "2026-01-01T00:00:00Z",
      output: null,
      requiredActions: [],
      status,
    },
  };
}

function createClient(events: StreamEvent[]): {
  client: TrueForgeClient;
  getSignal: () => AbortSignal | undefined;
} {
  let signal: AbortSignal | undefined;
  const client = {
    sessions: {
      createTurnStream: async (
        _sessionId: string,
        _request: TrueForgeApi.CreateTurnSessionsStreamRequest,
        options?: { abortSignal?: AbortSignal }
      ) => {
        signal = options?.abortSignal;
        return {
          withMetadata: () =>
            (async function* () {
              yield* events;
            })(),
        };
      },
    },
  };

  return {
    client: client as unknown as TrueForgeClient,
    getSignal: () => signal,
  };
}

test("streams root-thread deltas once, merges them, and completes", async () => {
  const baseMessage: TrueForgeApi.ModelMessageEvent = {
    id: "assistant-message",
    threadId: "main",
    createdAt: "2026-01-01T00:00:00Z",
    type: "model.message",
    content: "",
  };
  const events: StreamEvent[] = [
    { id: "event-base", data: baseMessage },
    {
      id: "event-subagent",
      data: modelDelta("subagent-message", "child-agent", "not shown"),
    },
    {
      id: "event-delta",
      data: modelDelta("assistant-message", "main", "Hello"),
    },
    {
      id: "event-delta",
      data: modelDelta("assistant-message", "main", "duplicate"),
    },
    { id: "event-done", data: turnDone("done") },
  ];
  const fake = createClient(events);
  const deltas: string[] = [];

  const result = await new StreamingService().streamTurn(
    fake.client,
    "session-a",
    "Hi",
    new AbortController().signal,
    (delta) => deltas.push(delta)
  );

  assert.equal(result, "done");
  assert.deepEqual(deltas, ["Hello"]);
  assert.equal(baseMessage.content, "Hello");
});

test("uses a completed main-thread message when no delta was emitted", async () => {
  const events: StreamEvent[] = [
    {
      id: "event-final",
      data: {
        id: "assistant-final",
        threadId: "main",
        createdAt: "2026-01-01T00:00:00Z",
        type: "model.message",
        content: [{ type: "text", text: "Complete answer" }],
      },
    },
    { id: "event-done", data: turnDone("done") },
  ];
  const deltas: string[] = [];

  await new StreamingService().streamTurn(
    createClient(events).client,
    "session-a",
    "Hi",
    new AbortController().signal,
    (delta) => deltas.push(delta)
  );

  assert.deepEqual(deltas, ["Complete answer"]);
});

test("returns cancellation when TrueForge sends a cancelled terminal event", async () => {
  const result = await new StreamingService().streamTurn(
    createClient([{ id: "event-done", data: turnDone("cancelled") }]).client,
    "session-a",
    "Hi",
    new AbortController().signal,
    () => assert.fail("Cancelled turns must not emit a final answer")
  );

  assert.equal(result, "cancelled");
});

test("propagates terminal errors and rejects streams without completion", async () => {
  const streaming = new StreamingService();

  await assert.rejects(
    streaming.streamTurn(
      createClient([{ id: "event-done", data: turnDone("error") }]).client,
      "session-a",
      "Hi",
      new AbortController().signal,
      () => undefined
    ),
    /Model request failed/
  );
  await assert.rejects(
    streaming.streamTurn(
      createClient([]).client,
      "session-a",
      "Hi",
      new AbortController().signal,
      () => undefined
    ),
    /without a terminal event/
  );
});

test("passes cancellation to the SDK and treats an aborted stream as cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  const fake = createClient([]);
  const result = await new StreamingService().streamTurn(
    fake.client,
    "session-a",
    "Hi",
    controller.signal,
    () => undefined
  );

  assert.equal(fake.getSignal(), controller.signal);
  assert.equal(result, "cancelled");
});
