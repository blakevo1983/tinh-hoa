import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createExpeditionPanel } from "./expedition-panel.js";
import { createTradePanel } from "./trade-panel.js";
import { createDiplomacyPanel } from "./diplomacy-panel.js";
import type { NpcPlanet, PlanetExpedition } from "@tinh-hoa/shared";

class StubElement {
  tagName: string;
  className = "";
  private _textContent = "";
  value = "";
  disabled = false;
  style: Record<string, string> = {
    setProperty: () => {},
  } as unknown as Record<string, string>;
  attributes = new Map<string, string>();
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();
  onsubmit: ((e: { preventDefault: () => void }) => void) | null = null;
  onclick: (() => void) | null = null;
  onchange: (() => void) | null = null;

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

  click(): void {
    if (this.onclick) {
      this.onclick();
    }
    const handlers = this.listeners.get("click") ?? [];
    handlers.forEach((h) => h({ preventDefault: () => {} }));
  }

  querySelectorAll(selector: string): StubElement[] {
    const results: StubElement[] = [];
    const walk = (el: StubElement) => {
      if (
        (selector.startsWith(".") && el.className.includes(selector.slice(1))) ||
        el.tagName.toLowerCase() === selector.toLowerCase()
      ) {
        results.push(el);
      }
      el.children.forEach(walk);
    };
    this.children.forEach(walk);
    return results;
  }

  querySelector(selector: string): StubElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

describe("Expedition, Trade, and Diplomacy UI Components (T5.6)", () => {
  const origDocument = globalThis.document;

  const mockNpcPlanets: NpcPlanet[] = [
    {
      id: "npc-1",
      name: "Kim Cuong Tinh",
      element: "metal",
      personality: "mercantile",
      coordX: 10,
      coordY: 20,
      discoveredMinStage: 4,
      baseRewards: { metal: 100 },
    },
    {
      id: "npc-2",
      name: "Hoa Diem Tinh",
      element: "fire",
      personality: "aggressive",
      coordX: -30,
      coordY: 15,
      discoveredMinStage: 4,
      baseRewards: { fire: 120 },
    },
  ];

  beforeEach(() => {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => new StubElement(tag),
      createTextNode: (text: string) => {
        const el = new StubElement("span");
        el.textContent = text;
        return el;
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = origDocument;
  });

  describe("ExpeditionPanel", () => {
    it("renders lock warning when planet is below stage 4 or lacks observatory", () => {
      const panel = createExpeditionPanel({
        planetId: "planet-1",
        planetStage: 3,
        hasObservatory: false,
        activeExpedition: null,
        npcPlanets: mockNpcPlanets,
      }) as unknown as StubElement;

      expect(panel.textContent).toContain("Cần nâng cấp hành tinh");
      expect(panel.querySelectorAll("button").length).toBe(0);
    });

    it("renders NPC planets list and triggers onStartExpedition", async () => {
      const onStartExpedition = vi.fn().mockResolvedValue(undefined);
      const panel = createExpeditionPanel({
        planetId: "planet-1",
        planetStage: 4,
        hasObservatory: true,
        activeExpedition: null,
        npcPlanets: mockNpcPlanets,
        onStartExpedition,
      }) as unknown as StubElement;

      const buttons = panel.querySelectorAll("button");
      expect(buttons.length).toBe(2);

      buttons[0]!.click();
      expect(onStartExpedition).toHaveBeenCalledWith("npc-1");
    });

    it("renders ready expedition with settle button triggering onSettleExpedition", async () => {
      const onSettleExpedition = vi.fn().mockResolvedValue(undefined);
      const readyExpedition: PlanetExpedition = {
        id: "exp-1",
        planetId: "planet-1",
        userId: "user-1",
        targetNpcId: "npc-1",
        status: "in_progress",
        costResource: "metal",
        costAmount: 50,
        finishAt: new Date(Date.now() - 1000).toISOString(), // finished in past
      };

      const panel = createExpeditionPanel({
        planetId: "planet-1",
        planetStage: 4,
        hasObservatory: true,
        activeExpedition: readyExpedition,
        npcPlanets: mockNpcPlanets,
        onSettleExpedition,
      }) as unknown as StubElement;

      const settleBtn = panel.querySelector("button");
      expect(settleBtn).not.toBeNull();
      settleBtn?.click();
      expect(onSettleExpedition).toHaveBeenCalledWith("exp-1");
    });
  });

  describe("TradePanel", () => {
    it("renders trade interface, preview and executes onTrade callback", async () => {
      const onTrade = vi.fn().mockResolvedValue(undefined);
      const panel = createTradePanel({
        planetId: "planet-1",
        npcPlanets: mockNpcPlanets,
        dailyTradedUnits: 500,
        dailyCap: 2000,
        onTrade,
      }) as unknown as StubElement;

      expect(panel.textContent).toContain("500/2000");

      const form = panel.querySelector("form");
      expect(form).not.toBeNull();

      const selects = panel.querySelectorAll("select");
      // 0: npcSelect, 1: offerSelect, 2: targetSelect
      selects[0]!.value = "npc-1";
      selects[1]!.value = "fire";
      selects[2]!.value = "water";

      const amountInput = panel.querySelector("input");
      if (amountInput) amountInput.value = "100";

      form?.onsubmit?.({ preventDefault: () => {} });
      expect(onTrade).toHaveBeenCalledWith("npc-1", "fire", 100, "water");
    });
  });

  describe("DiplomacyPanel", () => {
    it("renders relations list and allows leader to propose alliance", async () => {
      const onProposeDiplomacy = vi.fn().mockResolvedValue(undefined);
      const panel = createDiplomacyPanel({
        myAllianceId: "alliance-mine",
        isLeader: true,
        otherAlliances: [{ id: "alliance-target", name: "Thien Ha", tag: "THN", level: 2 }],
        diplomacyRecords: [],
        onProposeDiplomacy,
      }) as unknown as StubElement;

      const proposeBtn = panel
        .querySelectorAll("button")
        .find((b) => b.textContent?.includes("Đề Xuất Đồng Minh"));
      expect(proposeBtn).toBeDefined();

      proposeBtn?.click();
      expect(onProposeDiplomacy).toHaveBeenCalledWith("alliance-target", "propose_alliance");
    });

    it("allows leader to accept pending alliance proposal", async () => {
      const onRespondDiplomacy = vi.fn().mockResolvedValue(undefined);
      const panel = createDiplomacyPanel({
        myAllianceId: "alliance-b",
        isLeader: true,
        otherAlliances: [{ id: "alliance-a", name: "Bao La", tag: "BLA", level: 3 }],
        diplomacyRecords: [
          {
            id: "rel-1",
            allianceA: "alliance-a",
            allianceB: "alliance-b",
            status: "pending_alliance",
            proposedByAllianceId: "alliance-a",
          },
        ],
        onRespondDiplomacy,
      }) as unknown as StubElement;

      const acceptBtn = panel
        .querySelectorAll("button")
        .find((b) => b.textContent?.includes("Chấp Thuận"));
      expect(acceptBtn).toBeDefined();

      acceptBtn?.click();
      expect(onRespondDiplomacy).toHaveBeenCalledWith("alliance-a", true);
    });
  });
});
