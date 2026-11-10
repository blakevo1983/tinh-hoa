import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWarRoomPanel } from "./war-room-panel.js";
import { createBattleViewerModal } from "./battle-viewer-modal.js";
import type { BattleResult } from "@tinh-hoa/shared";

class StubElement {
  tagName: string;
  className = "";
  id = "";
  private _textContent = "";
  value = "";
  checked = false;
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

describe("Warfare UI Components (T6.6)", () => {
  const origDocument = globalThis.document;

  beforeEach(() => {
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => new StubElement(tag),
    };
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = origDocument;
  });

  describe("WarRoomPanel", () => {
    it("renders defense roster and allows saving formation", async () => {
      const onSaveDefenseFormation = vi.fn().mockResolvedValue(undefined);
      const mockCreatures = [
        { id: "c-1", name: "Linh Quy", primaryElement: "water", currentHp: 500 },
        { id: "c-2", name: "Bach Ho", primaryElement: "metal", currentHp: 600 },
      ];

      const panel = createWarRoomPanel({
        planetId: "planet-1",
        myCreatures: mockCreatures,
        currentDefenseCreatureIds: ["c-1"],
        onSaveDefenseFormation,
      }) as unknown as StubElement;

      const forms = panel.querySelectorAll("form");
      const defForm = forms[0];
      expect(defForm).toBeDefined();

      defForm?.onsubmit?.({ preventDefault: () => {} });
      expect(onSaveDefenseFormation).toHaveBeenCalledWith(["c-1"]);
    });

    it("allows selecting attacker creatures and mobilizing assault", async () => {
      const onAttackPlanet = vi.fn().mockResolvedValue(undefined);
      const mockCreatures = [
        { id: "c-1", name: "Linh Quy", primaryElement: "water", currentHp: 500 },
      ];

      const panel = createWarRoomPanel({
        planetId: "planet-1",
        myCreatures: mockCreatures,
        currentDefenseCreatureIds: [],
        onAttackPlanet,
      }) as unknown as StubElement;

      const forms = panel.querySelectorAll("form");
      const atkForm = forms[1];
      expect(atkForm).toBeDefined();

      const input = atkForm?.querySelector("input");
      if (input) input.value = "target-planet-uuid";

      // Toggle attacker checkbox
      const chk =
        atkForm?.querySelector("input[type='checkbox']") || atkForm?.querySelectorAll("input")[1];
      if (chk) {
        chk.checked = true;
        chk.onchange?.();
      }

      atkForm?.onsubmit?.({ preventDefault: () => {} });
      expect(onAttackPlanet).toHaveBeenCalledWith("target-planet-uuid", ["c-1"]);
    });
  });

  describe("BattleViewerModal", () => {
    it("renders battle outcome, hp summary, and triggers onClose", () => {
      const onClose = vi.fn();
      const mockResult: BattleResult = {
        winnerSide: "attacker",
        totalRounds: 3,
        attackerRemainingHp: 400,
        defenderRemainingHp: 0,
        rounds: [
          {
            roundNumber: 1,
            actingSide: "attacker",
            actingFighterId: "c-1",
            actingFighterName: "Bach Ho",
            targetFighterId: "c-2",
            targetFighterName: "Thanh Long",
            damageDealt: 120,
            isCritical: true,
            elementalMultiplier: 1.3,
            targetRemainingHp: 180,
            descriptionVi: "Bach Ho tấn công Thanh Long gây 120 sát thương. (Bạo kích!)",
          },
        ],
        assimilatedGene: {
          element: "wood",
          bonusStatKey: "qi",
          bonusValue: 8,
        },
      };

      const modal = createBattleViewerModal({
        battleResult: mockResult,
        attackerName: "Quan Doan Tinh Hoa",
        defenderName: "Quan Doan Hac Am",
        onClose,
      }) as unknown as StubElement;

      expect(modal.textContent).toContain("Chiến Thắng Vang Dội!");
      expect(modal.textContent).toContain("400 HP");
      expect(modal.textContent).toContain("Bach Ho tấn công");

      const closeBtn = modal.querySelector("button");
      closeBtn?.click();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
