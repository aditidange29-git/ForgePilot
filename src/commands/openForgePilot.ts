import * as vscode from "vscode";

/**
 * Opens the ForgePilot sidebar view.
 */
export function openForgePilot(): void {
  vscode.commands.executeCommand("workbench.view.extension.forgepilot-sidebar");
}
