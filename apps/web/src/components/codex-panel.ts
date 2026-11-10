import {
  BASE_SPECIES,
  BASE_ITEMS,
  ELEMENT_DEFINITIONS,
  ELEMENT_KEYS,
  type SpeciesDefinition,
  type ItemDefinition,
  type Genome,
} from "@tinh-hoa/shared";
import { renderCreature } from "../canvas/creature-renderer.js";
import { setupCanvasDpi } from "../canvas/planet-renderer.js";
import { t } from "../i18n/index.js";

export interface CodexPanelOptions {
  unlockedSpeciesKeys: string[];
  unlockedItemKeys: string[];
}

export function createCodexPanel(options: CodexPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card codex-panel";
  container.style.marginTop = "16px";
  container.style.padding = "16px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.color = "#f8fafc";

  // Header & Progress Summary
  const header = document.createElement("div");
  header.style.marginBottom = "14px";

  const title = document.createElement("h3");
  title.style.margin = "0 0 4px 0";
  title.style.fontSize = "1.1rem";
  title.style.color = "#38bdf8";
  title.textContent = t("codex.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0 0 8px 0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("codex.subtitle");

  const progressLine = document.createElement("div");
  progressLine.style.display = "flex";
  progressLine.style.gap = "16px";
  progressLine.style.fontSize = "0.85rem";
  progressLine.style.fontWeight = "600";
  progressLine.style.color = "#4ade80";

  const speciesProgress = document.createElement("span");
  speciesProgress.className = "species-progress-label";
  speciesProgress.textContent = t("codex.speciesProgress")
    .replace("{count}", String(options.unlockedSpeciesKeys.length))
    .replace("{total}", String(BASE_SPECIES.length));

  const itemsProgress = document.createElement("span");
  itemsProgress.className = "items-progress-label";
  itemsProgress.textContent = t("codex.itemsProgress")
    .replace("{count}", String(options.unlockedItemKeys.length))
    .replace("{total}", String(BASE_ITEMS.length));

  progressLine.appendChild(speciesProgress);
  progressLine.appendChild(itemsProgress);

  header.appendChild(title);
  header.appendChild(subtitle);
  header.appendChild(progressLine);
  container.appendChild(header);

  // Tabs (Creatures / Materials)
  let activeTab: "creatures" | "items" = "creatures";
  let activeElementFilter: string = "all";

  const tabsRow = document.createElement("div");
  tabsRow.style.display = "flex";
  tabsRow.style.gap = "8px";
  tabsRow.style.marginBottom = "12px";

  const tabCreatures = document.createElement("button");
  tabCreatures.type = "button";
  tabCreatures.className = "codex-tab-btn tab-creatures";
  tabCreatures.style.minHeight = "44px";
  tabCreatures.style.padding = "8px 16px";
  tabCreatures.style.borderRadius = "8px";
  tabCreatures.style.border = "1px solid #475569";
  tabCreatures.style.backgroundColor = "#38bdf8";
  tabCreatures.style.color = "#0f172a";
  tabCreatures.style.fontWeight = "600";
  tabCreatures.style.cursor = "pointer";
  tabCreatures.textContent = t("codex.tabCreatures");

  const tabItems = document.createElement("button");
  tabItems.type = "button";
  tabItems.className = "codex-tab-btn tab-items";
  tabItems.style.minHeight = "44px";
  tabItems.style.padding = "8px 16px";
  tabItems.style.borderRadius = "8px";
  tabItems.style.border = "1px solid #475569";
  tabItems.style.backgroundColor = "#1e293b";
  tabItems.style.color = "#f8fafc";
  tabItems.style.fontWeight = "600";
  tabItems.style.cursor = "pointer";
  tabItems.textContent = t("codex.tabItems");

  tabsRow.appendChild(tabCreatures);
  tabsRow.appendChild(tabItems);
  container.appendChild(tabsRow);

  // Element Filter Pills
  const filterRow = document.createElement("div");
  filterRow.style.display = "flex";
  filterRow.style.gap = "6px";
  filterRow.style.overflowX = "auto";
  filterRow.style.paddingBottom = "8px";
  filterRow.style.marginBottom = "14px";

  const allPill = document.createElement("button");
  allPill.type = "button";
  allPill.style.minHeight = "36px";
  allPill.style.padding = "4px 12px";
  allPill.style.borderRadius = "18px";
  allPill.style.border = "1px solid #475569";
  allPill.style.backgroundColor = "#38bdf8";
  allPill.style.color = "#0f172a";
  allPill.style.fontSize = "0.8rem";
  allPill.style.fontWeight = "600";
  allPill.style.cursor = "pointer";
  allPill.textContent = t("codex.filterAll");
  filterRow.appendChild(allPill);

  const filterPills = new Map<string, HTMLButtonElement>();
  filterPills.set("all", allPill);

  ELEMENT_KEYS.forEach((elem) => {
    const def = ELEMENT_DEFINITIONS[elem];
    const pill = document.createElement("button");
    pill.type = "button";
    pill.style.minHeight = "36px";
    pill.style.padding = "4px 12px";
    pill.style.borderRadius = "18px";
    pill.style.border = "1px solid #475569";
    pill.style.backgroundColor = "#1e293b";
    pill.style.color = "#cbd5e1";
    pill.style.fontSize = "0.8rem";
    pill.style.cursor = "pointer";
    pill.textContent = `${def.nameVi} ${def.symbol}`;

    pill.addEventListener("click", () => {
      activeElementFilter = elem;
      updateFilterButtons();
      renderContent();
    });

    filterPills.set(elem, pill);
    filterRow.appendChild(pill);
  });

  allPill.addEventListener("click", () => {
    activeElementFilter = "all";
    updateFilterButtons();
    renderContent();
  });

  container.appendChild(filterRow);

  function updateFilterButtons(): void {
    filterPills.forEach((pill, key) => {
      const isActive = key === activeElementFilter;
      pill.style.backgroundColor = isActive ? "#38bdf8" : "#1e293b";
      pill.style.color = isActive ? "#0f172a" : "#cbd5e1";
      pill.style.fontWeight = isActive ? "600" : "400";
    });
  }

  // Cards Content Container
  const cardsGrid = document.createElement("div");
  cardsGrid.style.display = "grid";
  cardsGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
  cardsGrid.style.gap = "12px";
  container.appendChild(cardsGrid);

  function renderContent(): void {
    while (cardsGrid.firstChild) {
      cardsGrid.removeChild(cardsGrid.firstChild);
    }

    if (activeTab === "creatures") {
      renderCreaturesList();
    } else {
      renderItemsList();
    }
  }

  function renderCreaturesList(): void {
    const list = BASE_SPECIES.filter((s: SpeciesDefinition) => {
      if (activeElementFilter === "all") return true;
      return s.element === activeElementFilter;
    });

    for (const species of list) {
      const isUnlocked = options.unlockedSpeciesKeys.includes(species.key);
      const card = document.createElement("div");
      card.className = "codex-card creature-card";
      card.style.padding = "12px";
      card.style.borderRadius = "8px";
      card.style.backgroundColor = "#0f172a";
      card.style.border = isUnlocked ? "1px solid #334155" : "1px dashed #475569";
      card.style.opacity = isUnlocked ? "1" : "0.65";

      const elemDef = ELEMENT_DEFINITIONS[species.element];

      if (isUnlocked) {
        // Render mini canvas
        const canvas = document.createElement("canvas");
        canvas.style.width = "72px";
        canvas.style.height = "72px";
        canvas.style.display = "block";
        canvas.style.margin = "0 auto 8px auto";
        canvas.style.borderRadius = "6px";
        canvas.style.backgroundColor = "#1e293b";

        try {
          const ctx = setupCanvasDpi(canvas, 72, 72);
          const sampleGenome: Genome = {
            primary: species.element,
            secondary: null,
            stats: { ...species.baseStats },
            traits: [...species.defaultTraits],
            generation: 1,
            inbreeding: 0,
          };
          renderCreature(ctx, sampleGenome, {
            size: 72,
            centerX: 36,
            centerY: 36,
          });
        } catch {
          // Fallback if canvas context fails in test
        }

        const nameLine = document.createElement("div");
        nameLine.style.fontWeight = "600";
        nameLine.style.color = elemDef.pastelColor;
        nameLine.style.fontSize = "0.95rem";
        nameLine.style.marginBottom = "4px";
        nameLine.textContent = `${species.nameVi} (${elemDef.symbol})`;

        const desc = document.createElement("div");
        desc.style.fontSize = "0.8rem";
        desc.style.color = "#94a3b8";
        desc.style.marginBottom = "6px";
        desc.textContent = species.descriptionVi;

        const stats = species.baseStats;
        const statsLine = document.createElement("div");
        statsLine.style.fontSize = "0.75rem";
        statsLine.style.color = "#cbd5e1";
        statsLine.textContent = `Qi ${stats.qi} | Giáp ${stats.guard} | Tốc ${stats.agility} | Hòa ${stats.harmony} | Loạn ${stats.chaos}`;

        card.appendChild(canvas);
        card.appendChild(nameLine);
        card.appendChild(desc);
        card.appendChild(statsLine);
      } else {
        const lockIcon = document.createElement("div");
        lockIcon.style.textAlign = "center";
        lockIcon.style.fontSize = "1.5rem";
        lockIcon.style.marginBottom = "8px";
        lockIcon.style.color = "#64748b";
        lockIcon.textContent = "🔒";

        const titleLocked = document.createElement("div");
        titleLocked.style.fontWeight = "600";
        titleLocked.style.color = "#94a3b8";
        titleLocked.style.fontSize = "0.9rem";
        titleLocked.textContent = `??? [${elemDef.nameVi}]`;

        const hint = document.createElement("div");
        hint.style.fontSize = "0.8rem";
        hint.style.color = "#64748b";
        hint.style.marginTop = "4px";
        hint.textContent = `Ươm mầm trên địa hình ${species.element} để đánh thức loài này.`;

        card.appendChild(lockIcon);
        card.appendChild(titleLocked);
        card.appendChild(hint);
      }

      cardsGrid.appendChild(card);
    }
  }

  function renderItemsList(): void {
    const list = BASE_ITEMS.filter((item: ItemDefinition) => {
      if (activeElementFilter === "all") return true;
      return item.element === activeElementFilter;
    });

    for (const item of list) {
      const isUnlocked = options.unlockedItemKeys.includes(item.key);
      const card = document.createElement("div");
      card.className = "codex-card item-card";
      card.style.padding = "12px";
      card.style.borderRadius = "8px";
      card.style.backgroundColor = "#0f172a";
      card.style.border = isUnlocked ? "1px solid #334155" : "1px dashed #475569";
      card.style.opacity = isUnlocked ? "1" : "0.65";

      const elemDef = ELEMENT_DEFINITIONS[item.element];

      if (isUnlocked) {
        const headerLine = document.createElement("div");
        headerLine.style.display = "flex";
        headerLine.style.justifyContent = "space-between";
        headerLine.style.alignItems = "center";
        headerLine.style.marginBottom = "6px";

        const nameLine = document.createElement("span");
        nameLine.style.fontWeight = "600";
        nameLine.style.color = elemDef.pastelColor;
        nameLine.style.fontSize = "0.95rem";
        nameLine.textContent = `${item.nameVi} ${elemDef.symbol}`;

        const rarityBadge = document.createElement("span");
        rarityBadge.style.fontSize = "0.75rem";
        rarityBadge.style.padding = "2px 6px";
        rarityBadge.style.borderRadius = "4px";
        rarityBadge.style.backgroundColor =
          item.category === "legendary"
            ? "rgba(234, 179, 8, 0.2)"
            : item.category === "compound"
              ? "rgba(168, 85, 247, 0.2)"
              : "rgba(100, 116, 139, 0.2)";
        rarityBadge.style.color =
          item.category === "legendary"
            ? "#facc15"
            : item.category === "compound"
              ? "#c084fc"
              : "#94a3b8";
        rarityBadge.textContent =
          item.category === "legendary"
            ? `Huyền Thoại (★${item.rarity})`
            : item.category === "compound"
              ? `Hợp Chất (★${item.rarity})`
              : `Thô (★${item.rarity})`;

        headerLine.appendChild(nameLine);
        headerLine.appendChild(rarityBadge);

        const desc = document.createElement("div");
        desc.style.fontSize = "0.8rem";
        desc.style.color = "#94a3b8";
        desc.textContent = item.descriptionVi;

        card.appendChild(headerLine);
        card.appendChild(desc);
      } else {
        const lockIcon = document.createElement("div");
        lockIcon.style.textAlign = "center";
        lockIcon.style.fontSize = "1.5rem";
        lockIcon.style.marginBottom = "8px";
        lockIcon.style.color = "#64748b";
        lockIcon.textContent = "🔒";

        const titleLocked = document.createElement("div");
        titleLocked.style.fontWeight = "600";
        titleLocked.style.color = "#94a3b8";
        titleLocked.style.fontSize = "0.9rem";
        titleLocked.textContent = `??? [${elemDef.nameVi}]`;

        const hint = document.createElement("div");
        hint.style.fontSize = "0.8rem";
        hint.style.color = "#64748b";
        hint.style.marginTop = "4px";
        hint.textContent = "Chế tác hoặc thu hoạch từ sinh vật để mở khóa.";

        card.appendChild(lockIcon);
        card.appendChild(titleLocked);
        card.appendChild(hint);
      }

      cardsGrid.appendChild(card);
    }
  }

  tabCreatures.addEventListener("click", () => {
    activeTab = "creatures";
    tabCreatures.style.backgroundColor = "#38bdf8";
    tabCreatures.style.color = "#0f172a";
    tabItems.style.backgroundColor = "#1e293b";
    tabItems.style.color = "#f8fafc";
    renderContent();
  });

  tabItems.addEventListener("click", () => {
    activeTab = "items";
    tabItems.style.backgroundColor = "#38bdf8";
    tabItems.style.color = "#0f172a";
    tabCreatures.style.backgroundColor = "#1e293b";
    tabCreatures.style.color = "#f8fafc";
    renderContent();
  });

  renderContent();
  return container;
}
