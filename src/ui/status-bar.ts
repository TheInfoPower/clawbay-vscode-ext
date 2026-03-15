import * as vscode from "vscode";
import type { QuotaSnapshot } from "../quota/model";

export class QuotaStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  public constructor(commandId: string, alignment: vscode.StatusBarAlignment) {
    this.item = vscode.window.createStatusBarItem(alignment, 100);
    this.item.command = commandId;
    this.item.text = "$(sync~spin) Clawbay: loading";
    this.item.tooltip = "Clawbay quota status";
    this.item.show();
  }

  public renderLoading(): void {
    this.item.text = "$(sync~spin) Clawbay: refreshing";
    this.item.tooltip = "Refreshing quota placeholder";
  }

  public renderSnapshot(snapshot: QuotaSnapshot): void {
    this.item.text = this.iconFor(snapshot.state) + " " + snapshot.label;
    this.item.tooltip = `${snapshot.detail}\nUpdated: ${snapshot.updatedAtIso}`;
  }

  public renderError(detail: string): void {
    this.item.text = "$(warning) Clawbay: error";
    this.item.tooltip = detail;
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
      case "stubbed":
        return "$(beaker)";
      default:
        return "$(warning)";
    }
  }
}
