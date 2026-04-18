import * as vscode from "vscode";
import type { QuotaSnapshot } from "../quota/model";

export class QuotaStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly defaultCommand: string;

  public constructor(commandId: string, alignment: vscode.StatusBarAlignment) {
    this.defaultCommand = commandId;
    this.item = vscode.window.createStatusBarItem(alignment, 100);
    this.item.command = commandId;
    this.item.text = "$(sync~spin) Clawbay: loading";
    this.item.tooltip = "Clawbay quota status";
    this.item.show();
  }

  public renderLoading(): void {
    this.item.text = "$(sync~spin) Clawbay: loading";
    this.item.tooltip = "Fetching the latest quota status.";
    this.item.command = this.defaultCommand;
  }

  public renderPlaceholder(): void {
    this.item.text = "$(circle-large-outline) Clawbay: ready";
    this.item.tooltip = "Quota status placeholder. Refresh to update.";
    this.item.command = this.defaultCommand;
  }

  public renderSnapshot(
    snapshot: QuotaSnapshot,
    actions?: {
      unauthenticatedCommandId?: string;
      retryCommandId?: string;
    }
  ): void {
    this.item.text = this.iconFor(snapshot.state) + " " + snapshot.label;
    this.item.tooltip = `${snapshot.detail}\nUpdated: ${snapshot.updatedAtIso}`;
    if (snapshot.state === "unauthenticated" && actions?.unauthenticatedCommandId) {
      this.item.command = actions.unauthenticatedCommandId;
      return;
    }

    if (
      (snapshot.state === "rate-limited" || snapshot.state === "transient-failure") &&
      actions?.retryCommandId
    ) {
      this.item.command = actions.retryCommandId;
      return;
    }

    this.item.command = this.defaultCommand;
  }

  public renderError(detail: string): void {
    this.item.text = "$(warning) Clawbay: error";
    this.item.tooltip = detail;
    this.item.command = this.defaultCommand;
  }

  public dispose(): void {
    this.item.dispose();
  }

  private iconFor(state: QuotaSnapshot["state"]): string {
    switch (state) {
      case "loading":
        return "$(sync~spin)";
      case "unauthenticated":
        return "$(key)";
      case "authenticated-with-quota":
        return "$(graph)";
      case "rate-limited":
        return "$(clock)";
      case "transient-failure":
        return "$(warning)";
      default:
        return "$(warning)";
    }
  }
}
