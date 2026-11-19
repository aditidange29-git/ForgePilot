import {
  TrueForge,
  TrueForgeApi,
  isEventDelta,
  mergeEventDelta,
} from "@truefoundry/trueforge-sdk";

export type TurnResult = "done" | "cancelled";

export class StreamingService {
  async streamTurn(
    client: InstanceType<typeof TrueForge>,
    sessionId: string,
    prompt: string,
    signal: AbortSignal,
    onDelta: (delta: string) => void
  ): Promise<TurnResult> {
    const stream = await client.sessions.createTurnStream(
      sessionId,
      {
        input: [{ type: "user.message", content: prompt }],
      },
      { abortSignal: signal }
    );

    const seenEventIds = new Set<string>();
    const textDeltaMessageIds = new Set<string>();
    const baseMessages = new Map<string, TrueForgeApi.ModelMessageEvent>();
    const pendingDeltas = new Map<
      string,
      TrueForgeApi.ModelMessageDeltaEvent[]
    >();
    let terminalState: "done" | "cancelled" | "error" | undefined;
    let terminalOutput: TrueForgeApi.ModelMessageEvent | null = null;
    let turnError: string | undefined;

    for await (const metadata of stream.withMetadata()) {
      if (metadata.id) {
        if (seenEventIds.has(metadata.id)) {
          continue;
        }
        seenEventIds.add(metadata.id);
      }

      const event = metadata.data;
      if (isEventDelta(event)) {
        if (event.threadId !== "main") {
          continue;
        }

        const messageKey = this._messageKey(event.threadId, event.id);
        const baseMessage = baseMessages.get(messageKey);
        if (baseMessage) {
          mergeEventDelta(baseMessage, event);
        } else {
          const deltas = pendingDeltas.get(messageKey) ?? [];
          deltas.push(event);
          pendingDeltas.set(messageKey, deltas);
        }

        if (event.content) {
          textDeltaMessageIds.add(messageKey);
          onDelta(event.content);
        }
      } else if (event.type === "model.message") {
        if (event.threadId !== "main") {
          continue;
        }

        const messageKey = this._messageKey(event.threadId, event.id);
        baseMessages.set(messageKey, event);
        const deltas = pendingDeltas.get(messageKey);
        if (deltas) {
          for (const delta of deltas) {
            mergeEventDelta(event, delta);
          }
          pendingDeltas.delete(messageKey);
        }
      } else if (event.type === "turn.done") {
        terminalState = event.state.status;
        if (event.state.status === "error") {
          turnError = event.state.message;
        } else if (event.state.status === "done") {
          terminalOutput = event.state.output;
        }
      }
    }

    if (signal.aborted || terminalState === "cancelled") {
      return "cancelled";
    }
    if (terminalState === "error") {
      throw new Error(turnError || "TrueForge reported that the agent turn failed.");
    }
    if (!terminalState) {
      throw new Error("TrueForge ended the turn stream without a terminal event.");
    }

    const finalMessages = [...baseMessages.values()];
    if (
      terminalOutput?.threadId === "main" &&
      !finalMessages.some((message) => message.id === terminalOutput?.id)
    ) {
      finalMessages.push(terminalOutput);
    }
    for (const message of finalMessages) {
      const messageKey = this._messageKey(message.threadId, message.id);
      if (textDeltaMessageIds.has(messageKey)) {
        continue;
      }
      const text = this._getText(message.content);
      if (text) {
        onDelta(text);
      }
    }

    return "done";
  }

  private _messageKey(threadId: string, messageId: string): string {
    return `${threadId}\0${messageId}`;
  }

  private _getText(
    content: TrueForgeApi.ModelMessageEvent["content"]
  ): string {
    if (typeof content === "string") {
      return content;
    }
    if (!content) {
      return "";
    }
    return content
      .filter(
        (part): part is TrueForgeApi.ChatCompletionContentPartText =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("");
  }
}
