import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createResourceHud } from "./resource-hud.js";
import { createBuildingPanel } from "./building-panel.js";

// Lightweight in-memory DOM stub for unit testing without external libraries
class StubElement {
  tagName: string;
  className = "";
  textContent = "";
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();
  disabled = false;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
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

  querySelectorAll(selector: string): StubElement[] {
    const tag = selector.toUpperCase();
    const result: StubElement[] = [];
    const traverse = (el: StubElement) => {
      for (const child of el.children) {
        if (child.tagName === tag) {
          result.push(child);
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
}

describe("UI Components: Resource HUD and Building Panel (T1.7)", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Resource HUD with all provided balances", () => {
    const { element, updateBalances } = createResourceHud({
      balances: [
        { resourceKey: "wood", amount: 150, ratePerSec: 0.5, cap: 500 },
        { resourceKey: "water", amount: 200, ratePerSec: 1.0, cap: 500 },
      ],
    });

    expect(element.getAttribute("aria-label")).toBe("Bảng tài nguyên hành tinh");
    expect(element.children.length).toBe(2);

    const firstBadge = element.children[0] as unknown as StubElement;
    expect(firstBadge.children[1]?.textContent).toBe("Mộc");
    expect(firstBadge.children[2]?.textContent).toBe("150");
    expect(firstBadge.children[3]?.textContent).toBe("+0.5/s");

    // Dynamic balance updates
    updateBalances([{ resourceKey: "wood", amount: 175, ratePerSec: 0.8, cap: 500 }]);
    expect(firstBadge.children[2]?.textContent).toBe("175");
    expect(firstBadge.children[3]?.textContent).toBe("+0.8/s");
  });

  it("renders building options for an empty tile and triggers onPlaceBuilding", async () => {
    const onPlaceBuilding = vi.fn().mockResolvedValue(undefined);
    const onUpgradeBuilding = vi.fn().mockResolvedValue(undefined);

    const panel = createBuildingPanel({
      tileX: 3,
      tileY: 4,
      tileElement: "fire",
      planetPrimaryElement: "fire",
      existingBuilding: null,
      onPlaceBuilding,
      onUpgradeBuilding,
    }) as unknown as StubElement;

    const buttons = panel.querySelectorAll("button");
    expect(buttons.length).toBe(2);

    expect(buttons[0]?.textContent).toContain("Xây Trạm Thu Thập");
    expect(buttons[1]?.textContent).toContain("Xây Kho Chứa");

    buttons[0]?.click();
    expect(onPlaceBuilding).toHaveBeenCalledWith("harvester", 3, 4);
  });

  it("renders upgrade option for an existing building and triggers onUpgradeBuilding", async () => {
    const onPlaceBuilding = vi.fn().mockResolvedValue(undefined);
    const onUpgradeBuilding = vi.fn().mockResolvedValue(undefined);

    const panel = createBuildingPanel({
      tileX: 1,
      tileY: 2,
      tileElement: "wood",
      planetPrimaryElement: "wood",
      existingBuilding: {
        id: "b-123",
        kind: "harvester",
        level: 1,
      },
      onPlaceBuilding,
      onUpgradeBuilding,
    }) as unknown as StubElement;

    const upgradeBtn = panel.querySelector("button");
    expect(upgradeBtn).toBeDefined();
    expect(upgradeBtn?.textContent).toContain("Nâng cấp Cấp 2");

    upgradeBtn?.click();
    expect(onUpgradeBuilding).toHaveBeenCalledWith("b-123");
  });
});
