import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAlliancePanel, type AllianceViewData } from "./alliance-panel.js";
import { createPartyPanel, type ActivePartyView } from "./party-panel.js";

class StubElement {
  tagName: string;
  className = "";
  textContent = "";
  value = "";
  disabled = false;
  maxLength = 0;
  type = "";
  placeholder = "";
  style: Record<string, string> = {
    setProperty: () => {},
  } as unknown as Record<string, string>;
  attributes = new Map<string, string>();
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();
  onsubmit: ((e: { preventDefault: () => void }) => void) | null = null;
  onclick: (() => void) | null = null;

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

describe("Alliance and Party UI Components (T4.6)", () => {
  const origDocument = globalThis.document;

  beforeEach(() => {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => new StubElement(tag),
    };
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = origDocument;
  });

  describe("AlliancePanel", () => {
    it("renders create form when user has no alliance and triggers onCreateAlliance", async () => {
      const onCreateAlliance = vi.fn().mockResolvedValue(undefined);
      const panel = createAlliancePanel({
        currentUserId: "u_1",
        alliance: null,
        onCreateAlliance,
      }) as unknown as StubElement;

      expect(panel.className).toContain("alliance-panel");
      const form = panel.querySelector("form");
      expect(form).not.toBeNull();

      const inputs = panel.querySelectorAll("input");
      expect(inputs.length).toBe(2);
      inputs[0]!.value = "Thien Ha";
      inputs[1]!.value = "THN";

      form?.onsubmit?.({ preventDefault: () => {} });
      expect(onCreateAlliance).toHaveBeenCalledWith("Thien Ha", "THN");
    });

    it("renders alliance details, vault and allows deposit", async () => {
      const onDeposit = vi.fn().mockResolvedValue(undefined);
      const mockAlliance: AllianceViewData = {
        id: "a_1",
        name: "Lien Minh Tinh Hoa",
        tag: "LMTH",
        leaderId: "u_1",
        level: 3,
        memberCap: 25,
        vaultBalances: { metal: 500, water: 300 },
        buff: {
          uniqueElementsCount: 2,
          generativePairsCount: 1,
          productionBonusPct: 15,
          hasFiveElementsHarmony: false,
          descriptionVi: "+15% sản lượng từ tương sinh Kim-Thủy",
        },
        members: [
          {
            userId: "u_1",
            displayName: "Vo Cuc",
            role: "leader",
            joinedAt: new Date().toISOString(),
          },
          {
            userId: "u_2",
            displayName: "Thai Cuc",
            role: "member",
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      const panel = createAlliancePanel({
        currentUserId: "u_1",
        alliance: mockAlliance,
        onDeposit,
      }) as unknown as StubElement;

      const buttons = panel.querySelectorAll("button");
      // Find deposit button
      const depositBtn = buttons.find((b) => b.textContent?.includes("Góp Kho"));
      expect(depositBtn).toBeDefined();

      const amountInput = panel.querySelectorAll("input").find((i) => i.type === "number");
      if (amountInput) amountInput.value = "100";

      depositBtn?.click();
      expect(onDeposit).toHaveBeenCalled();
    });

    it("renders withdrawal and member management buttons for leader", async () => {
      const onWithdraw = vi.fn().mockResolvedValue(undefined);
      const onKick = vi.fn().mockResolvedValue(undefined);
      const onPromote = vi.fn().mockResolvedValue(undefined);
      const mockAlliance: AllianceViewData = {
        id: "a_1",
        name: "Lien Minh Tinh Hoa",
        tag: "LMTH",
        leaderId: "u_1",
        level: 1,
        memberCap: 20,
        vaultBalances: { fire: 100 },
        buff: {
          uniqueElementsCount: 1,
          generativePairsCount: 0,
          productionBonusPct: 5,
          hasFiveElementsHarmony: false,
          descriptionVi: "+5% sản lượng",
        },
        members: [
          {
            userId: "u_1",
            displayName: "Leader User",
            role: "leader",
            joinedAt: new Date().toISOString(),
          },
          {
            userId: "u_2",
            displayName: "Target User",
            role: "member",
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      const panel = createAlliancePanel({
        currentUserId: "u_1",
        alliance: mockAlliance,
        onWithdraw,
        onKick,
        onPromote,
      }) as unknown as StubElement;

      const buttons = panel.querySelectorAll("button");
      const withdrawBtn = buttons.find((b) => b.textContent?.includes("Rút Kho"));
      expect(withdrawBtn).toBeDefined();

      const kickBtn = buttons.find((b) => b.textContent?.includes("Trục Xuất"));
      expect(kickBtn).toBeDefined();
      kickBtn?.click();
      expect(onKick).toHaveBeenCalledWith("u_2");

      const promoteBtn = buttons.find((b) => b.textContent?.includes("Thăng Sĩ Quan"));
      expect(promoteBtn).toBeDefined();
      promoteBtn?.click();
      expect(onPromote).toHaveBeenCalledWith("u_2", "officer");
    });
  });

  describe("PartyPanel", () => {
    it("renders create party form and triggers onCreateParty", async () => {
      const onCreateParty = vi.fn().mockResolvedValue(undefined);
      const panel = createPartyPanel({
        currentUserId: "u_1",
        activeParty: null,
        onCreateParty,
      }) as unknown as StubElement;

      const form = panel.querySelector("form");
      expect(form).not.toBeNull();

      const titleInput = panel.querySelector("input");
      if (titleInput) titleInput.value = "Diệt Boss Thiên Hà";

      form?.onsubmit?.({ preventDefault: () => {} });
      expect(onCreateParty).toHaveBeenCalled();
    });

    it("renders active party details, contribution scores and distribute button for leader", async () => {
      const onDistributeRewards = vi.fn().mockResolvedValue(undefined);
      const onLeaveParty = vi.fn().mockResolvedValue(undefined);

      const mockParty: ActivePartyView = {
        id: "party_1",
        leaderId: "u_1",
        title: "San Boss Cap Do 5",
        activityType: "celestial_boss",
        rewardDistribution: "personal",
        maxMembers: 4,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        members: [
          {
            userId: "u_1",
            displayName: "Leader Voy",
            contributionScore: 150,
            isLeader: true,
            joinedAt: new Date().toISOString(),
          },
          {
            userId: "u_2",
            displayName: "Member Voy",
            contributionScore: 50,
            isLeader: false,
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      const panel = createPartyPanel({
        currentUserId: "u_1",
        activeParty: mockParty,
        onDistributeRewards,
        onLeaveParty,
      }) as unknown as StubElement;

      const buttons = panel.querySelectorAll("button");
      const distributeBtn = buttons.find((b) => b.textContent?.includes("Kết Thúc & Chia Thưởng"));
      expect(distributeBtn).toBeDefined();
      distributeBtn?.click();
      expect(onDistributeRewards).toHaveBeenCalledWith("party_1");

      const leaveBtn = buttons.find((b) => b.textContent?.includes("Rời Nhóm"));
      expect(leaveBtn).toBeDefined();
      leaveBtn?.click();
      expect(onLeaveParty).toHaveBeenCalledWith("party_1");
    });
  });
});
