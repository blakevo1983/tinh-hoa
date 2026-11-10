import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createChatPanel } from "./chat-panel.js";
import type { ChatTransport } from "../lib/chat-transport.js";
import type { ChatMessage } from "@tinh-hoa/shared";

class StubElement {
  tagName: string;
  className = "";
  textContent = "";
  value = "";
  disabled = false;
  style: Record<string, string> = {
    setProperty: () => {},
  } as unknown as Record<string, string>;
  attributes = new Map<string, string>();
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();
  scrollTop = 0;
  scrollHeight = 100;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
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

  click(): void {
    const handlers = this.listeners.get("click") ?? [];
    handlers.forEach((h) => h({ preventDefault: () => {} }));
  }

  focus(): void {}

  querySelectorAll(selector: string): StubElement[] {
    const result: StubElement[] = [];
    const isClass = selector.startsWith(".");
    const target = isClass ? selector.slice(1) : selector.toUpperCase();

    const traverse = (el: StubElement) => {
      for (const child of el.children) {
        if (isClass) {
          if (child.className && child.className.split(" ").includes(target)) {
            result.push(child);
          }
        } else {
          if (child.tagName === target) {
            result.push(child);
          }
        }
        traverse(child);
      }
    };
    traverse(this);
    return result;
  }

  querySelector(selector: string): StubElement | null {
    const all = this.querySelectorAll(selector);
    return all[0] ?? null;
  }

  getAllText(): string {
    let str = this.textContent;
    for (const child of this.children) {
      str += " " + child.getAllText();
    }
    return str;
  }
}

describe("ChatPanel Component (T3.5)", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockMessages: ChatMessage[] = [
    {
      id: "msg-1",
      channelId: "global",
      senderId: "user-alice",
      senderName: "Alice",
      clientMsgId: "c1",
      content: "Xin chào thế giới!",
      filteredContent: "Xin chào thế giới!",
      createdAt: new Date().toISOString(),
    },
  ];

  it("renders chat header, tabs and loads initial messages", async () => {
    const mockTransport: ChatTransport = {
      send: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {}),
      getHistory: vi.fn().mockResolvedValue(mockMessages),
    };

    const panel = createChatPanel({
      currentUserId: "user-alice",
      planetId: "p1",
      transport: mockTransport,
    }) as unknown as StubElement;

    expect(panel.querySelector("h3")?.textContent).toContain("Kênh Truyền Tin");
    const tabs = panel.querySelectorAll(".chat-tab-btn");
    expect(tabs.length).toBe(2);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockTransport.getHistory).toHaveBeenCalledWith("global");
    expect(panel.getAllText()).toContain("Xin chào thế giới!");
  });

  it("sends message on transmit button click", async () => {
    const sentMsg: ChatMessage = {
      id: "msg-new",
      channelId: "global",
      senderId: "user-alice",
      senderName: "Alice",
      clientMsgId: "c2",
      content: "Tin nhắn mới",
      filteredContent: "Tin nhắn mới",
      createdAt: new Date().toISOString(),
    };

    const mockTransport: ChatTransport = {
      send: vi.fn().mockResolvedValue(sentMsg),
      subscribe: vi.fn().mockReturnValue(() => {}),
      getHistory: vi.fn().mockResolvedValue([]),
    };

    const panel = createChatPanel({
      currentUserId: "user-alice",
      planetId: "p1",
      transport: mockTransport,
    }) as unknown as StubElement;

    const input = panel.querySelector(".chat-input") as unknown as StubElement;
    input.value = "Tin nhắn mới";

    const sendBtn = panel.querySelector(".chat-send-btn") as unknown as StubElement;
    sendBtn.click();

    expect(mockTransport.send).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 10));

    expect(panel.getAllText()).toContain("Tin nhắn mới");
  });

  it("receives realtime broadcast message", async () => {
    let subscriberCallback: ((msg: ChatMessage) => void) | null = null;
    const mockTransport: ChatTransport = {
      send: vi.fn(),
      subscribe: vi.fn().mockImplementation((_channel, cb) => {
        subscriberCallback = cb;
        return () => {};
      }),
      getHistory: vi.fn().mockResolvedValue([]),
    };

    const panel = createChatPanel({
      currentUserId: "user-alice",
      planetId: "p1",
      transport: mockTransport,
    }) as unknown as StubElement;

    await new Promise((r) => setTimeout(r, 10));

    // Simulate incoming broadcast
    const broadcastMsg: ChatMessage = {
      id: "bcast-1",
      channelId: "global",
      senderId: "user-bob",
      senderName: "Bob",
      clientMsgId: "cb1",
      content: "Chào Alice!",
      filteredContent: "Chào Alice!",
      createdAt: new Date().toISOString(),
    };

    expect(subscriberCallback).toBeDefined();
    subscriberCallback!(broadcastMsg);

    expect(panel.getAllText()).toContain("Chào Alice!");
  });
});
