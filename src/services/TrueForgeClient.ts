import * as vscode from "vscode";
import { TrueForge } from "@truefoundry/trueforge-sdk";

const DEFAULT_BASE_URL = "http://localhost:8790";
const TOKEN_SECRET_KEY = "forgepilot.trueforge.token";

export class TrueForgeClientService {
  private _client: TrueForge | undefined;
  private _clientKey: string | undefined;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getClient(): Promise<TrueForge> {
    const configuredUrl = vscode.workspace
      .getConfiguration("forgepilot.trueforge")
      .get<string>("baseUrl", DEFAULT_BASE_URL)
      .trim();

    let url: URL;
    try {
      url = new URL(configuredUrl);
    } catch {
      throw new Error("ForgePilot TrueForge base URL must be a valid URL.");
    }

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw new Error(
        "ForgePilot TrueForge base URL must use HTTP or HTTPS and must not contain credentials."
      );
    }

    const baseUrl = url.toString().replace(/\/+$/, "");
    const token = await this.secrets.get(TOKEN_SECRET_KEY);
    const clientKey = `${baseUrl}\0${token ?? ""}`;

    if (this._client && this._clientKey === clientKey) {
      return this._client;
    }

    this._client = new TrueForge({
      baseUrl,
      timeoutInSeconds: 600,
      ...(token ? { token } : {}),
    });
    this._clientKey = clientKey;
    return this._client;
  }

  reset(): void {
    this._client = undefined;
    this._clientKey = undefined;
  }
}

export const trueForgeTokenSecretKey = TOKEN_SECRET_KEY;
