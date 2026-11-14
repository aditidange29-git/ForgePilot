import * as vscode from "vscode";
import { TrueForgeClient } from "../types/trueforge.js";
import { ChatMode } from "../types/messages.js";
import { getModeInstructions } from "./PromptService.js";

const SESSION_MAP_KEY = "forgepilot.trueforge.sessions";

export class TrueForgeSessionService {
  private _mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: vscode.Memento) {}

  async getOrCreateSession(
    conversationId: string,
    client: TrueForgeClient,
    signal: AbortSignal,
    mode: ChatMode
  ): Promise<string> {
    this._throwIfAborted(signal);
    const existingSessionId = this._readSessions()[conversationId];

    const { data: models } = await client.models.list({
      abortSignal: signal,
    });
    this._throwIfAborted(signal);
    const modelName = models[0]?.name;
    if (!modelName) {
      throw new Error(
        "No configured TrueForge model was found. Configure a model on the TrueForge server and try again."
      );
    }

    const agent = {
      spec: {
        model: { name: modelName },
        instructions: getModeInstructions(mode),
      },
    };

    if (existingSessionId) {
      await client.sessions.update(
        existingSessionId,
        { agent },
        { abortSignal: signal }
      );
      this._throwIfAborted(signal);
      return existingSessionId;
    }

    const { data: session } = await client.sessions.create(
      { agent },
      { abortSignal: signal }
    );
    this._throwIfAborted(signal);

    await this._mutateSessions((sessions) => {
      sessions[conversationId] = session.id;
    });
    return session.id;
  }

  async removeSession(conversationId: string): Promise<void> {
    await this._mutateSessions((sessions) => {
      delete sessions[conversationId];
    });
  }

  private async _mutateSessions(
    mutate: (sessions: Record<string, string>) => void
  ): Promise<void> {
    const operation = this._mutationQueue.then(async () => {
      const sessions = this._readSessions();
      mutate(sessions);
      await this.storage.update(SESSION_MAP_KEY, sessions);
    });
    this._mutationQueue = operation.catch(() => undefined);
    await operation;
  }

  private _readSessions(): Record<string, string> {
    const stored = this.storage.get<unknown>(SESSION_MAP_KEY);
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
      return {};
    }

    const sessions: Record<string, string> = {};
    for (const [conversationId, sessionId] of Object.entries(stored)) {
      if (typeof sessionId === "string") {
        sessions[conversationId] = sessionId;
      }
    }
    return sessions;
  }

  private _throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new Error("TrueForge request was cancelled.");
    }
  }
}
