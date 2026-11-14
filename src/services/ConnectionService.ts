import { TrueForgeClientService } from "./TrueForgeClient.js";
import { TrueForgeClient } from "../types/trueforge.js";
import { ConnectionStatus } from "../types/messages.js";

export class ConnectionService {
  private _connected = false;

  constructor(
    private readonly clientService: TrueForgeClientService,
    private readonly setStatus: (status: ConnectionStatus) => void
  ) {}

  get isConnected(): boolean {
    return this._connected;
  }

  async connect(signal?: AbortSignal): Promise<TrueForgeClient> {
    this.setStatus("connecting");
    try {
      const client = await this.clientService.getClient();
      await client.server.getCapabilities({
        timeoutInSeconds: 10,
        ...(signal ? { abortSignal: signal } : {}),
      });
      this._connected = true;
      this.setStatus("ready");
      return client;
    } catch (error) {
      this._connected = false;
      this.setStatus(signal?.aborted ? "not-connected" : "error");
      throw error;
    }
  }

  markDisconnected(): void {
    this._connected = false;
  }
}
