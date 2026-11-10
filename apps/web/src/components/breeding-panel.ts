import {
  getElementRelation,
  ELEMENT_DEFINITIONS,
  type ElementKey,
  type Genome,
} from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface AvailableCreature {
  id: string;
  speciesKey: string;
  name: string;
  genome: Genome;
  parentAId?: string | null;
  parentBId?: string | null;
}

export interface BreedingPanelOptions {
  planetId: string;
  creatures: AvailableCreature[];
  onBreed: (parentAId: string, parentBId: string) => Promise<void>;
}

export function createBreedingPanel(options: BreedingPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card breeding-panel";
  container.style.marginTop = "16px";
  container.style.padding = "16px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.color = "#f8fafc";

  // Header
  const header = document.createElement("div");
  header.style.marginBottom = "14px";

  const title = document.createElement("h3");
  title.style.margin = "0 0 4px 0";
  title.style.fontSize = "1.1rem";
  title.style.color = "#38bdf8";
  title.textContent = t("breeding.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("breeding.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Slots Container (2 specimen slots)
  const slotsGrid = document.createElement("div");
  slotsGrid.style.display = "grid";
  slotsGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  slotsGrid.style.gap = "14px";
  slotsGrid.style.marginBottom = "16px";

  let selectedParentA: AvailableCreature | null = null;
  let selectedParentB: AvailableCreature | null = null;

  function createSlot(
    slotLabelText: string,
    onSelect: (c: AvailableCreature | null) => void,
  ): {
    slotBox: HTMLElement;
    select: HTMLSelectElement;
    detailsBox: HTMLElement;
  } {
    const slotBox = document.createElement("div");
    slotBox.style.padding = "12px";
    slotBox.style.borderRadius = "8px";
    slotBox.style.backgroundColor = "#0f172a";
    slotBox.style.border = "1px dashed #475569";

    const label = document.createElement("label");
    label.style.display = "block";
    label.style.fontSize = "0.85rem";
    label.style.fontWeight = "600";
    label.style.marginBottom = "8px";
    label.style.color = "#cbd5e1";
    label.textContent = slotLabelText;
    slotBox.appendChild(label);

    const select = document.createElement("select");
    select.className = "creature-select";
    select.style.width = "100%";
    select.style.minHeight = "44px";
    select.style.padding = "8px 12px";
    select.style.borderRadius = "6px";
    select.style.backgroundColor = "#1e293b";
    select.style.border = "1px solid #475569";
    select.style.color = "#f8fafc";
    select.style.fontSize = "0.9rem";
    select.setAttribute("aria-label", slotLabelText);

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = t("breeding.selectPlaceholder");
    select.appendChild(defaultOpt);

    for (const c of options.creatures) {
      const opt = document.createElement("option");
      opt.value = c.id;
      const elemDef = ELEMENT_DEFINITIONS[c.genome.primary as ElementKey];
      const elemText = elemDef ? `[${elemDef.nameVi}]` : "";
      opt.textContent = `${c.name} ${elemText} (Gen ${c.genome.generation})`;
      select.appendChild(opt);
    }

    const detailsBox = document.createElement("div");
    detailsBox.style.marginTop = "8px";
    detailsBox.style.fontSize = "0.8rem";
    detailsBox.style.color = "#94a3b8";
    detailsBox.style.lineHeight = "1.4";
    detailsBox.style.minHeight = "40px";

    select.addEventListener("change", () => {
      const found = options.creatures.find((c) => c.id === select.value) || null;
      onSelect(found);
      updateSlotDetails(detailsBox, found);
      updateAffinities();
    });

    slotBox.appendChild(select);
    slotBox.appendChild(detailsBox);
    return { slotBox, select, detailsBox };
  }

  function updateSlotDetails(detailsBox: HTMLElement, creature: AvailableCreature | null): void {
    if (!creature) {
      detailsBox.textContent = t("breeding.chooseCreature");
      return;
    }
    const elemDef = ELEMENT_DEFINITIONS[creature.genome.primary as ElementKey];
    const s = creature.genome.stats;
    detailsBox.innerHTML = `
      <div style="color: ${elemDef?.pastelColor || "#38bdf8"}; font-weight: 600;">
        ${elemDef?.nameVi || ""} ${elemDef?.symbol || ""} — Gen ${creature.genome.generation}
      </div>
      <div>Qi: ${s.qi} | Giáp: ${s.guard} | Tốc: ${s.agility} | Hòa: ${s.harmony} | Loạn: ${s.chaos}</div>
    `;
  }

  const slotA = createSlot(t("breeding.slotA"), (c) => {
    selectedParentA = c;
  });
  const slotB = createSlot(t("breeding.slotB"), (c) => {
    selectedParentB = c;
  });

  slotsGrid.appendChild(slotA.slotBox);
  slotsGrid.appendChild(slotB.slotBox);
  container.appendChild(slotsGrid);

  // Affinity & Forecast Box
  const affinityBox = document.createElement("div");
  affinityBox.style.padding = "12px";
  affinityBox.style.borderRadius = "8px";
  affinityBox.style.backgroundColor = "#0f172a";
  affinityBox.style.border = "1px solid #334155";
  affinityBox.style.marginBottom = "14px";
  affinityBox.style.fontSize = "0.85rem";

  const affinityTitle = document.createElement("div");
  affinityTitle.style.fontWeight = "600";
  affinityTitle.style.color = "#cbd5e1";
  affinityTitle.style.marginBottom = "4px";
  affinityTitle.textContent = t("breeding.relation");

  const affinityDesc = document.createElement("div");
  affinityDesc.style.color = "#94a3b8";
  affinityDesc.textContent = t("breeding.chooseCreature");

  const inbreedingWarn = document.createElement("div");
  inbreedingWarn.style.display = "none";
  inbreedingWarn.style.marginTop = "6px";
  inbreedingWarn.style.color = "#f87171";
  inbreedingWarn.style.fontWeight = "600";
  inbreedingWarn.textContent = t("breeding.inbreedingWarning");

  affinityBox.appendChild(affinityTitle);
  affinityBox.appendChild(affinityDesc);
  affinityBox.appendChild(inbreedingWarn);
  container.appendChild(affinityBox);

  // Cost and Incubation Time
  const metaBox = document.createElement("div");
  metaBox.style.display = "flex";
  metaBox.style.justifyContent = "space-between";
  metaBox.style.fontSize = "0.85rem";
  metaBox.style.color = "#cbd5e1";
  metaBox.style.marginBottom = "14px";

  const timeLabel = document.createElement("span");
  timeLabel.textContent = t("breeding.hatchingTime").replace("{time}", "60");

  const costLabel = document.createElement("span");
  costLabel.textContent = t("breeding.cost").replace("{amount}", "20").replace("{resource}", "Qi");

  metaBox.appendChild(timeLabel);
  metaBox.appendChild(costLabel);
  container.appendChild(metaBox);

  // Notice: no hard failure
  const noHarmNotice = document.createElement("div");
  noHarmNotice.style.fontSize = "0.8rem";
  noHarmNotice.style.color = "#64748b";
  noHarmNotice.style.fontStyle = "italic";
  noHarmNotice.style.marginBottom = "12px";
  noHarmNotice.textContent = t("breeding.noHarm");
  container.appendChild(noHarmNotice);

  // Feedback status message
  const feedbackMsg = document.createElement("div");
  feedbackMsg.style.display = "none";
  feedbackMsg.style.padding = "10px 12px";
  feedbackMsg.style.borderRadius = "6px";
  feedbackMsg.style.fontSize = "0.85rem";
  feedbackMsg.style.marginBottom = "12px";
  container.appendChild(feedbackMsg);

  // Hatching Pulse Effect (visual incubation feedback)
  const hatchingBox = document.createElement("div");
  hatchingBox.style.display = "none";
  hatchingBox.style.padding = "14px";
  hatchingBox.style.borderRadius = "8px";
  hatchingBox.style.textAlign = "center";
  hatchingBox.style.backgroundColor = "rgba(56, 189, 248, 0.1)";
  hatchingBox.style.border = "1px solid #38bdf8";
  hatchingBox.style.marginBottom = "12px";
  hatchingBox.style.fontSize = "0.9rem";
  hatchingBox.style.color = "#38bdf8";
  hatchingBox.textContent = t("breeding.hatching");
  container.appendChild(hatchingBox);

  // Action Button (Breed)
  const breedBtn = document.createElement("button");
  breedBtn.type = "button";
  breedBtn.className = "btn-breed";
  breedBtn.style.width = "100%";
  breedBtn.style.minHeight = "44px";
  breedBtn.style.padding = "10px 16px";
  breedBtn.style.borderRadius = "8px";
  breedBtn.style.border = "none";
  breedBtn.style.backgroundColor = "#0284c7";
  breedBtn.style.color = "#ffffff";
  breedBtn.style.fontSize = "1rem";
  breedBtn.style.fontWeight = "600";
  breedBtn.style.cursor = "pointer";
  breedBtn.disabled = true;
  breedBtn.textContent = t("breeding.actionBreed");
  breedBtn.setAttribute("aria-label", t("breeding.actionBreed"));

  container.appendChild(breedBtn);

  function updateAffinities(): void {
    feedbackMsg.style.display = "none";
    if (!selectedParentA || !selectedParentB) {
      affinityDesc.textContent = t("breeding.chooseCreature");
      inbreedingWarn.style.display = "none";
      breedBtn.disabled = true;
      breedBtn.style.opacity = "0.5";
      return;
    }

    if (selectedParentA.id === selectedParentB.id) {
      affinityDesc.textContent = "Không thể lai tạo cùng một cá thể!";
      inbreedingWarn.style.display = "none";
      breedBtn.disabled = true;
      breedBtn.style.opacity = "0.5";
      return;
    }

    // Check inbreeding
    const isSibling =
      Boolean(
        selectedParentA.parentAId &&
        selectedParentB.parentAId &&
        selectedParentA.parentAId === selectedParentB.parentAId,
      ) ||
      Boolean(
        selectedParentA.parentBId &&
        selectedParentB.parentBId &&
        selectedParentA.parentBId === selectedParentB.parentBId,
      );
    const isParentChild =
      selectedParentA.id === selectedParentB.parentAId ||
      selectedParentA.id === selectedParentB.parentBId ||
      selectedParentB.id === selectedParentA.parentAId ||
      selectedParentB.id === selectedParentA.parentBId;

    if (isSibling || isParentChild) {
      inbreedingWarn.style.display = "block";
    } else {
      inbreedingWarn.style.display = "none";
    }

    const elemA = selectedParentA.genome.primary as ElementKey;
    const elemB = selectedParentB.genome.primary as ElementKey;
    const relation = getElementRelation(elemA, elemB);

    switch (relation) {
      case "same":
        affinityDesc.textContent = t("breeding.relationSame");
        affinityDesc.style.color = "#4ade80";
        break;
      case "generative":
        affinityDesc.textContent = t("breeding.relationGenerative");
        affinityDesc.style.color = "#38bdf8";
        break;
      case "destructive":
        affinityDesc.textContent = t("breeding.relationDestructive");
        affinityDesc.style.color = "#f59e0b";
        break;
      case "polar":
        affinityDesc.textContent = t("breeding.relationPolar");
        affinityDesc.style.color = "#c084fc";
        break;
      default:
        affinityDesc.textContent = t("breeding.relationNeutral");
        affinityDesc.style.color = "#cbd5e1";
    }

    breedBtn.disabled = false;
    breedBtn.style.opacity = "1";
  }

  breedBtn.addEventListener("click", async () => {
    if (!selectedParentA || !selectedParentB || breedBtn.disabled) return;

    breedBtn.disabled = true;
    breedBtn.textContent = "Đang giao hòa...";
    feedbackMsg.style.display = "none";

    try {
      await options.onBreed(selectedParentA.id, selectedParentB.id);

      feedbackMsg.style.display = "block";
      feedbackMsg.style.backgroundColor = "rgba(74, 222, 128, 0.15)";
      feedbackMsg.style.border = "1px solid #4ade80";
      feedbackMsg.style.color = "#4ade80";
      feedbackMsg.textContent = t("breeding.breedSuccess");

      hatchingBox.style.display = "block";

      // Reset selection
      slotA.select.value = "";
      slotB.select.value = "";
      selectedParentA = null;
      selectedParentB = null;
      updateSlotDetails(slotA.detailsBox, null);
      updateSlotDetails(slotB.detailsBox, null);
      updateAffinities();
    } catch (err: unknown) {
      feedbackMsg.style.display = "block";
      feedbackMsg.style.backgroundColor = "rgba(248, 113, 113, 0.15)";
      feedbackMsg.style.border = "1px solid #f87171";
      feedbackMsg.style.color = "#f87171";
      feedbackMsg.textContent = err instanceof Error ? err.message : "Đã xảy ra lỗi khi giao hòa.";
    } finally {
      breedBtn.textContent = t("breeding.actionBreed");
    }
  });

  return container;
}
