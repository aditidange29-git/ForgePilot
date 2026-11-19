import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { MessageService } from "../services/MessageService.js";

export class ForgePilotViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "forgepilot.view";

  private _view?: vscode.WebviewView;
  private readonly _messageService: MessageService;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    messageService: MessageService
  ) {
    this._messageService = messageService;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Register webview with MessageService
    this._messageService.setWebview(webviewView.webview);

    // Inbound messages from Webview
    const msgDisposable = webviewView.webview.onDidReceiveMessage(
      (message: unknown) => {
        this._messageService.handleMessage(message);
      }
    );

    webviewView.onDidDispose(() => {
      msgDisposable.dispose();
      if (this._view === webviewView) {
        this._view = undefined;
      }
    });
  }

  public get view(): vscode.WebviewView | undefined {
    return this._view;
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webview",
      "index.html"
    );

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "webview", "styles.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "src", "webview", "script.js")
    );

    // Nonce for CSP
    const nonce = this._getNonce();

    let html = fs.readFileSync(htmlPath, "utf8");
    html = html
      .replace(/\{\{STYLES_URI\}\}/g, stylesUri.toString())
      .replace(/\{\{SCRIPT_URI\}\}/g, scriptUri.toString())
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource);

    return html;
  }

  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
