/**
 * Tests for createAdminModerationPanel and createStatusIndicator
 * Covers Rule 25 UI interactions, accessibility, and moderation operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatusIndicator } from "./status-indicator.js";
import { createAdminModerationPanel, type ChatReportItem } from "./admin-moderation-panel.js";

class StubElement {
  tagName: string;
  className = "";
  id = "";
  private _textContent = "";
  value = "";
  disabled = false;
  style: Record<string, string> = {
    setProperty: () => {},
  } as unknown as Record<string, string>;
  attributes = new Map<string, string>();
  dataset: Record<string, string> = {};
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get textContent(): string {
    if (this._textContent) return this._textContent;
    return this.children.map((c) => c.textContent).join(" ");
  }

  set textContent(val: string) {
    this._textContent = val;
  }

  get firstChild(): StubElement | null {
    return this.children[0] ?? null;
  }

  removeChild(child: StubElement): StubElement {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
    return child;
  }

  remove(): void {
    // no-op for stub
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child: StubElement): StubElement {
    this.children.push(child);
    return child;
  }

  addEventListener(event: string, handler: (e?: unknown) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(handler);
    this.listeners.set(event, list);
  }

  removeEventListener(event: string, handler: (e?: unknown) => void): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  click(): void {
    const handlers = this.listeners.get("click") ?? [];
    handlers.forEach((h) => h({ preventDefault: () => {} }));
  }

  querySelector(selector: string): StubElement | null {
    const matches = this.querySelectorAll(selector);
    return matches[0] ?? null;
  }

  querySelectorAll(selector: string): StubElement[] {
    const results: StubElement[] = [];

    // Parse class parts (.xyz) and attribute parts ([attr="val"])
    const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
    const attrMatch = selector.match(/\[([a-zA-Z0-9_-]+)="?([^"\]]+)"?\]/);

    const walk = (el: StubElement) => {
      let matches = true;

      if (classMatch && classMatch[1] && !el.className.includes(classMatch[1])) {
        matches = false;
      }

      if (attrMatch && attrMatch[1] && attrMatch[2]) {
        const attrName = attrMatch[1];
        const attrVal = attrMatch[2];
        if (attrName.startsWith("data-")) {
          const key = attrName.replace(/^data-/, "");
          if (el.dataset[key] !== attrVal) matches = false;
        } else if (el.getAttribute(attrName) !== attrVal) {
          matches = false;
        }
      }

      if (matches && (classMatch || attrMatch)) {
        results.push(el);
      } else if (!classMatch && !attrMatch) {
        if (
          el.tagName.toLowerCase() === selector.toLowerCase() ||
          (selector.startsWith("#") && el.id === selector.slice(1))
        ) {
          results.push(el);
        }
      }

      for (const child of el.children) {
        walk(child);
      }
    };
    walk(this);
    return results;
  }
}

describe("StatusIndicatorComponent", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders with initial values and determines health state correctly", () => {
    const indicator = createStatusIndicator({
      initialPingMs: 45,
      initialFps: 60,
    });

    expect(indicator.getState()).toBe("online");
    expect(indicator.getPing()).toBe(45);
    expect(indicator.getFps()).toBe(60);

    const el = indicator.element as unknown as StubElement;
    expect(el.textContent).toContain("45ms");
    expect(el.textContent).toContain("60 FPS");
  });

  it("updates state to degraded when ping is between 150ms and 500ms", () => {
    const indicator = createStatusIndicator({ initialPingMs: 50 });
    expect(indicator.getState()).toBe("online");

    indicator.setPing(180);
    expect(indicator.getState()).toBe("degraded");
    const el = indicator.element as unknown as StubElement;
    expect(el.textContent).toContain("180ms");
  });

  it("updates state to offline when ping >= 500ms or negative", () => {
    const indicator = createStatusIndicator({ initialPingMs: 50 });

    indicator.setPing(650);
    expect(indicator.getState()).toBe("offline");

    indicator.setPing(-1);
    expect(indicator.getState()).toBe("offline");
    const el = indicator.element as unknown as StubElement;
    expect(el.textContent).toContain("ERR");
  });

  it("triggers onRefreshPing on button click", async () => {
    const onRefreshPing = vi.fn().mockResolvedValue(32);
    const indicator = createStatusIndicator({
      initialPingMs: 120,
      onRefreshPing,
    });

    const el = indicator.element as unknown as StubElement;
    const refreshBtn = el.querySelector(".status-refresh-btn");
    expect(refreshBtn).not.toBeNull();

    refreshBtn?.click();
    await Promise.resolve();

    expect(onRefreshPing).toHaveBeenCalled();
    expect(indicator.getPing()).toBe(32);
  });
});

describe("AdminModerationPanelComponent", () => {
  let sampleReports: ChatReportItem[];
  let globalKeyListeners: Array<(e: { key: string }) => void> = [];

  beforeEach(() => {
    globalKeyListeners = [];
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
    vi.stubGlobal("window", {
      addEventListener: (event: string, handler: (e: { key: string }) => void) => {
        if (event === "keydown") globalKeyListeners.push(handler);
      },
      removeEventListener: (event: string, handler: (e: { key: string }) => void) => {
        if (event === "keydown") {
          const idx = globalKeyListeners.indexOf(handler);
          if (idx !== -1) globalKeyListeners.splice(idx, 1);
        }
      },
    });

    sampleReports = [
      {
        id: "rep-1",
        reporterId: "u-1",
        reporterName: "Alice",
        reportedUserId: "u-spammer",
        reportedUserName: "SpamKing",
        reason: "Spamming advertisements repeatedly in world chat",
        messageContent: "Buy coins at cheapgame.test now!!!",
        status: "pending",
        createdAt: "2026-11-10T12:00:00Z",
      },
      {
        id: "rep-2",
        reporterId: "u-2",
        reporterName: "Bob",
        reportedUserId: "u-toxic",
        reportedUserName: "ToxicPlayer",
        reason: "Hate speech and profanity",
        messageContent: "Terrible player go away",
        status: "pending",
        createdAt: "2026-11-10T12:05:00Z",
      },
      {
        id: "rep-3",
        reporterId: "u-3",
        reporterName: "Charlie",
        reportedUserId: "u-innocent",
        reportedUserName: "JustPlayer",
        reason: "Unfair claim",
        messageContent: "Good game everyone",
        status: "resolved",
        createdAt: "2026-11-10T11:00:00Z",
      },
    ];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders reports list filtered by pending by default", () => {
    const panel = createAdminModerationPanel({
      reports: sampleReports,
    });

    const el = panel.element as unknown as StubElement;
    expect(el.textContent).toContain("SpamKing");
    expect(el.textContent).toContain("ToxicPlayer");
    expect(el.textContent).not.toContain("JustPlayer");
  });

  it("switches tabs to resolved and all", () => {
    const panel = createAdminModerationPanel({
      reports: sampleReports,
    });

    const el = panel.element as unknown as StubElement;
    const resolvedTab = el.querySelector('[data-filter="resolved"]');
    resolvedTab?.click();

    expect(el.textContent).toContain("JustPlayer");
    expect(el.textContent).not.toContain("SpamKing");

    const allTab = el.querySelector('[data-filter="all"]');
    allTab?.click();

    expect(el.textContent).toContain("SpamKing");
    expect(el.textContent).toContain("ToxicPlayer");
    expect(el.textContent).toContain("JustPlayer");
  });

  it("handles dismiss report action", async () => {
    const onDismissReport = vi.fn().mockResolvedValue(undefined);
    const panel = createAdminModerationPanel({
      reports: sampleReports,
      onDismissReport,
    });

    const el = panel.element as unknown as StubElement;
    const dismissBtn = el.querySelector('.btn-act-dismiss[data-id="rep-1"]');
    expect(dismissBtn).not.toBeNull();

    dismissBtn?.click();
    await Promise.resolve();

    expect(onDismissReport).toHaveBeenCalledWith("rep-1");
  });

  it("handles mute 1h action", async () => {
    const onMuteUser = vi.fn().mockResolvedValue(undefined);
    const panel = createAdminModerationPanel({
      reports: sampleReports,
      onMuteUser,
    });

    const el = panel.element as unknown as StubElement;
    const mute1hBtn = el.querySelector('.btn-act-mute-1h[data-id="rep-1"]');
    expect(mute1hBtn).not.toBeNull();

    mute1hBtn?.click();
    await Promise.resolve();

    expect(onMuteUser).toHaveBeenCalledWith("u-spammer", 3600);
  });

  it("handles mute 24h action", async () => {
    const onMuteUser = vi.fn().mockResolvedValue(undefined);
    const panel = createAdminModerationPanel({
      reports: sampleReports,
      onMuteUser,
    });

    const el = panel.element as unknown as StubElement;
    const mute24hBtn = el.querySelector('.btn-act-mute-24h[data-id="rep-2"]');
    expect(mute24hBtn).not.toBeNull();

    mute24hBtn?.click();
    await Promise.resolve();

    expect(onMuteUser).toHaveBeenCalledWith("u-toxic", 86400);
  });

  it("handles ban user action", async () => {
    const onBanUser = vi.fn().mockResolvedValue(undefined);
    const panel = createAdminModerationPanel({
      reports: sampleReports,
      onBanUser,
    });

    const el = panel.element as unknown as StubElement;
    const banBtn = el.querySelector('.btn-act-ban[data-id="rep-2"]');
    expect(banBtn).not.toBeNull();

    banBtn?.click();
    await Promise.resolve();

    expect(onBanUser).toHaveBeenCalledWith("u-toxic");
  });

  it("closes modal on Escape key press (Rule 25)", () => {
    const onClose = vi.fn();
    createAdminModerationPanel({
      reports: sampleReports,
      onClose,
    });

    for (const handler of globalKeyListeners) {
      handler({ key: "Escape" });
    }

    expect(onClose).toHaveBeenCalled();
  });
});
