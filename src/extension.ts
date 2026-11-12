import * as vscode from "vscode";
import { ForgePilotViewProvider } from "./providers/ForgePilotViewProvider";
import { StateService } from "./services/StateService";
import { MessageService } from "./services/MessageService";
import { openForgePilot } from "./commands/openForgePilot";
import { newChat } from "./commands/newChat";
import { clearChat } from "./commands/clearChat";

export function activate(context: vscode.ExtensionContext): void {
  const stateService = new StateService();
  const messageService = new MessageService(stateService);

  const provider = new ForgePilotViewProvider(
    context.extensionUri,
    messageService,
    stateService
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
    })
  );
}

export function deactivate(): void {
  // Cleanup is handled by VS Code disposing context.subscriptions
}
