import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBreedingPanel, type AvailableCreature } from "./breeding-panel.js";
import { createCodexPanel } from "./codex-panel.js";
import { BASE_SPECIES, BASE_ITEMS } from "@tinh-hoa/shared";

class StubElement {
  tagName: string;
  className = "";
  textContent = "";
  innerHTML = "";
  style: Record<string, string> = {
    setProperty: () => {},
  } as unknown as Record<string, string>;
  attributes = new Map<string, string>();
  children: StubElement[] = [];
  listeners = new Map<string, Array<(e?: unknown) => void>>();
  disabled = false;
  value = "";
  options: StubElement[] = [];

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
    if (child.tagName === "OPTION") {
      this.options.push(child);
    }
    return child;
  }

  addEventListener(event: string, handler: (e?: unknown) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(handler);
    this.listeners.set(event, list);
  }

  dispatchEvent(event: { type: string }): void {
    const handlers = this.listeners.get(event.type) ?? [];
    handlers.forEach((h) => h(event));
  }

  click(): void {
    const handlers = this.listeners.get("click") ?? [];
    handlers.forEach((h) => h({ preventDefault: () => {} }));
  }

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
    let str = this.textContent + " " + this.innerHTML;
    for (const child of this.children) {
      str += " " + child.getAllText();
    }
    return str;
  }
}

describe("BreedingPanel Component (T2.8)", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
    vi.stubGlobal(
      "Event",
      class {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockCreatures: AvailableCreature[] = [
    {
      id: "c-metal-1",
      speciesKey: "thiet_giap_thu",
      name: "Thiết Giáp Thú 01",
      genome: {
        primary: "metal",
        secondary: null,
        stats: { qi: 30, guard: 50, agility: 20, harmony: 20, chaos: 10 },
        traits: ["solid_armor"],
        generation: 1,
        inbreeding: 0,
      },
    },
    {
      id: "c-water-1",
      speciesKey: "bang_tinh_ngu",
      name: "Băng Tinh Ngư 01",
      genome: {
        primary: "water",
        secondary: null,
        stats: { qi: 35, guard: 25, agility: 40, harmony: 30, chaos: 10 },
        traits: ["water_skin"],
        generation: 1,
        inbreeding: 0,
      },
    },
    {
      id: "c-metal-child",
      speciesKey: "thiet_giap_thu",
      name: "Thiết Giáp Thú Con",
      parentAId: "c-metal-1",
      parentBId: "c-water-1",
      genome: {
        primary: "metal",
        secondary: "water",
        stats: { qi: 32, guard: 40, agility: 30, harmony: 25, chaos: 10 },
        traits: ["solid_armor"],
        generation: 2,
        inbreeding: 0,
      },
    },
  ];

  it("renders panel header and creature slots", () => {
    const onBreed = vi.fn().mockResolvedValue(undefined);
    const panel = createBreedingPanel({
      planetId: "planet-1",
      creatures: mockCreatures,
      onBreed,
    }) as unknown as StubElement;

    expect(panel.querySelector("h3")?.textContent).toContain("Hồ Giao Hòa");
    const selects = panel.querySelectorAll("select");
    expect(selects.length).toBe(2);
    expect(selects[0]!.options.length).toBe(mockCreatures.length + 1);
  });

  it("forecasts generative relation between Metal and Water", () => {
    const onBreed = vi.fn().mockResolvedValue(undefined);
    const panel = createBreedingPanel({
      planetId: "planet-1",
      creatures: mockCreatures,
      onBreed,
    }) as unknown as StubElement;

    const selects = panel.querySelectorAll("select");
    selects[0]!.value = "c-metal-1";
    selects[0]!.dispatchEvent(new Event("change"));

    selects[1]!.value = "c-water-1";
    selects[1]!.dispatchEvent(new Event("change"));

    // Metal produces Water -> Generative
    expect(panel.getAllText()).toContain("Tương Sinh");

    const breedBtn = panel.querySelector(".btn-breed") as unknown as StubElement;
    expect(breedBtn.disabled).toBe(false);
  });

  it("warns about inbreeding when breeding parent and child", () => {
    const onBreed = vi.fn().mockResolvedValue(undefined);
    const panel = createBreedingPanel({
      planetId: "planet-1",
      creatures: mockCreatures,
      onBreed,
    }) as unknown as StubElement;

    const selects = panel.querySelectorAll("select");
    selects[0]!.value = "c-metal-1";
    selects[0]!.dispatchEvent(new Event("change"));

    selects[1]!.value = "c-metal-child"; // parentAId is c-metal-1
    selects[1]!.dispatchEvent(new Event("change"));

    expect(panel.getAllText()).toContain("Cảnh báo cận huyết");
  });

  it("executes breed callback on button click and shows incubation feedback", async () => {
    const onBreed = vi.fn().mockResolvedValue(undefined);
    const panel = createBreedingPanel({
      planetId: "planet-1",
      creatures: mockCreatures,
      onBreed,
    }) as unknown as StubElement;

    const selects = panel.querySelectorAll("select");
    selects[0]!.value = "c-metal-1";
    selects[0]!.dispatchEvent(new Event("change"));
    selects[1]!.value = "c-water-1";
    selects[1]!.dispatchEvent(new Event("change"));

    const breedBtn = panel.querySelector(".btn-breed") as unknown as StubElement;
    breedBtn.click();

    expect(onBreed).toHaveBeenCalledWith("c-metal-1", "c-water-1");
    await new Promise((r) => setTimeout(r, 10));

    expect(panel.getAllText()).toContain("Gieo mầm thành công");
  });
});

describe("CodexPanel Component (T2.8)", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new StubElement(tag),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders codex progress counters and cards", () => {
    const unlockedSpecies = ["thiet_giap_thu", "bang_tinh_ngu"];
    const unlockedItems = ["raw_metal_ore", "raw_water_drop"];

    const panel = createCodexPanel({
      unlockedSpeciesKeys: unlockedSpecies,
      unlockedItemKeys: unlockedItems,
    }) as unknown as StubElement;

    const speciesLabel = panel.querySelector(".species-progress-label");
    const itemsLabel = panel.querySelector(".items-progress-label");

    expect(speciesLabel?.textContent).toContain(`2/${BASE_SPECIES.length}`);
    expect(itemsLabel?.textContent).toContain(`2/${BASE_ITEMS.length}`);

    // Check creatures rendered
    const creatureCards = panel.querySelectorAll(".creature-card");
    expect(creatureCards.length).toBe(BASE_SPECIES.length);

    // Check unlocked card has canvas
    const canvas = panel.querySelector("canvas");
    expect(canvas).toBeDefined();
  });

  it("switches to items tab and filters elements", () => {
    const panel = createCodexPanel({
      unlockedSpeciesKeys: ["thiet_giap_thu"],
      unlockedItemKeys: ["raw_metal_ore"],
    }) as unknown as StubElement;

    const tabItems = panel.querySelector(".tab-items") as unknown as StubElement;
    tabItems.click();

    const itemCards = panel.querySelectorAll(".item-card");
    expect(itemCards.length).toBe(BASE_ITEMS.length);
  });
});
