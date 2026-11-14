import * as vscode from "vscode";
import { ForgePilotViewProvider } from "./providers/ForgePilotViewProvider.js";
import { StateService } from "./services/StateService.js";
import { MessageService } from "./services/MessageService.js";
import { TrueForgeClientService, trueForgeTokenSecretKey } from "./services/TrueForgeClient.js";
import { ConnectionService } from "./services/ConnectionService.js";
import { TrueForgeSessionService } from "./services/TrueForgeSessionService.js";
import { StreamingService } from "./services/StreamingService.js";
import { EditorSelectionService } from "./services/EditorSelectionService.js";
import { openForgePilot } from "./commands/openForgePilot.js";
import { newChat } from "./commands/newChat.js";
import { clearChat } from "./commands/clearChat.js";

let activeMessageService: MessageService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const stateService = new StateService(context.workspaceState);
  const clientService = new TrueForgeClientService(context.secrets);
  const editorSelection = new EditorSelectionService();
  let messageService: MessageService;
  const connectionService = new ConnectionService(clientService, (status) => {
    stateService.setStatus(status);
    messageService?.sendStatus(status);
  });
  messageService = new MessageService(
    stateService,
    clientService,
    connectionService,
    new TrueForgeSessionService(context.workspaceState),
    new StreamingService(),
    editorSelection
  );
  activeMessageService = messageService;

  const provider = new ForgePilotViewProvider(
    context.extensionUri,
    messageService
  );

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ForgePilotViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("forgepilot.open", () => {
      openForgePilot();
    }),
    vscode.commands.registerCommand("forgepilot.newChat", () => {
      newChat(messageService);
    }),
    vscode.commands.registerCommand("forgepilot.clearChat", () => {
      clearChat(messageService);
    }),
    vscode.commands.registerCommand("forgepilot.connect", () => {
      void messageService.reconnect();
    }),
    vscode.commands.registerCommand("forgepilot.setToken", async () => {
      const token = await vscode.window.showInputBox({
        title: "Configure TrueForge Access Token",
        prompt: "Token is stored securely in VS Code SecretStorage.",
        password: true,
        ignoreFocusOut: true,
      });
      if (token === undefined) {
        return;
      }
      if (!token.trim()) {
        void vscode.window.showErrorMessage("The TrueForge token cannot be empty.");
        return;
      }
      await context.secrets.store(trueForgeTokenSecretKey, token.trim());
      messageService.resetConnection();
    }),
    vscode.commands.registerCommand("forgepilot.clearToken", async () => {
      await context.secrets.delete(trueForgeTokenSecretKey);
      messageService.resetConnection();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("forgepilot.trueforge")) {
        messageService.resetConnection();
      }
    }),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      editorSelection.capture(event.textEditor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      editorSelection.capture(editor);
    })
  );
  editorSelection.capture(vscode.window.activeTextEditor);
}

export function deactivate(): void {
  activeMessageService?.handleMessage({ type: "CANCEL_REQUEST" });
  activeMessageService = undefined;
}
