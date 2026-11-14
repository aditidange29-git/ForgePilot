import * as vscode from "vscode";
import type { EditorSelection, EditorSelectionProvider } from "./PromptService.js";

const EMPTY_SELECTION: EditorSelection = {
  code: "",
  fileName: "",
  languageId: "",
};

export class EditorSelectionService implements EditorSelectionProvider {
  private _lastEditorSelection: EditorSelection | undefined;

  capture(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    this._lastEditorSelection = editor.selection.isEmpty
      ? undefined
      : {
          code: editor.document.getText(editor.selection),
          fileName: vscode.workspace.asRelativePath(editor.document.uri),
          languageId: editor.document.languageId,
        };
  }

  getSelection(): EditorSelection {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return this._lastEditorSelection ?? EMPTY_SELECTION;
    }
    if (editor.selection.isEmpty) {
      return EMPTY_SELECTION;
    }
    return {
      code: editor.document.getText(editor.selection),
      fileName: vscode.workspace.asRelativePath(editor.document.uri),
      languageId: editor.document.languageId,
    };
  }
}
