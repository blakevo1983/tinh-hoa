import {
  BUILDING_DEFINITIONS,
  getBuildingCost,
  getBuildingTimeSec,
  ELEMENT_DEFINITIONS,
  type BuildingKind,
  type ElementKey,
} from "@tinh-hoa/shared";

export interface BuildingPanelOptions {
  tileX: number;
  tileY: number;
  tileElement: ElementKey;
  planetPrimaryElement: ElementKey;
  existingBuilding?: { id: string; kind: BuildingKind; level: number } | null;
  onPlaceBuilding: (kind: BuildingKind, tileX: number, tileY: number) => Promise<void>;
  onUpgradeBuilding: (buildingId: string) => Promise<void>;
}

export function createBuildingPanel(options: BuildingPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "building-box card";
  container.style.marginTop = "12px";
  container.style.padding = "16px";
  container.style.borderRadius = "10px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";

  const title = document.createElement("h4");
  title.style.margin = "0";
  title.style.fontSize = "1rem";
  title.style.color = "#f8fafc";
  title.textContent = `Vị trí ô: (${options.tileX}, ${options.tileY})`;

  const elemDef = ELEMENT_DEFINITIONS[options.tileElement];
  const elementBadge = document.createElement("span");
  elementBadge.style.fontSize = "0.8rem";
  elementBadge.style.padding = "2px 8px";
  elementBadge.style.borderRadius = "4px";
  elementBadge.style.backgroundColor = `${elemDef.pastelColor}22`;
  elementBadge.style.color = elemDef.pastelColor;
  elementBadge.textContent = `${elemDef.nameVi} ${elemDef.symbol}`;

  header.appendChild(title);
  header.appendChild(elementBadge);
  container.appendChild(header);

  // Status/Error feedback
  const feedbackMsg = document.createElement("div");
  feedbackMsg.style.display = "none";
  feedbackMsg.style.padding = "8px 12px";
  feedbackMsg.style.borderRadius = "6px";
  feedbackMsg.style.fontSize = "0.85rem";
  feedbackMsg.style.marginBottom = "10px";
  container.appendChild(feedbackMsg);

  const showFeedback = (msg: string, isError = true) => {
    feedbackMsg.style.display = "block";
    feedbackMsg.style.backgroundColor = isError
      ? "rgba(239, 68, 68, 0.15)"
      : "rgba(34, 197, 94, 0.15)";
    feedbackMsg.style.color = isError ? "#fca5a5" : "#86efac";
    feedbackMsg.textContent = msg;
  };

  if (options.existingBuilding) {
    // Existing building details & upgrade options
    const b = options.existingBuilding;
    const bDef = BUILDING_DEFINITIONS[b.kind];
    const nextLevel = b.level + 1;
    const upgradeCost = getBuildingCost(b.kind, nextLevel, options.planetPrimaryElement);
    const upgradeTime = getBuildingTimeSec(b.kind, nextLevel);

    const info = document.createElement("p");
    info.style.margin = "0 0 10px 0";
    info.style.fontSize = "0.9rem";
    info.style.color = "#cbd5e1";
    info.textContent = `Công trình: ${bDef.nameVi} (Cấp ${b.level})`;
    container.appendChild(info);

    const upgradeBtn = document.createElement("button");
    upgradeBtn.type = "button";
    upgradeBtn.className = "btn-primary";
    upgradeBtn.style.minHeight = "44px";
    upgradeBtn.style.padding = "8px 16px";
    upgradeBtn.style.borderRadius = "8px";
    upgradeBtn.style.backgroundColor = "#38bdf8";
    upgradeBtn.style.color = "#0f172a";
    upgradeBtn.style.fontWeight = "600";
    upgradeBtn.style.border = "none";
    upgradeBtn.style.cursor = "pointer";
    upgradeBtn.textContent = `Nâng cấp Cấp ${nextLevel} (Tốn: ${upgradeCost.amount} ${options.planetPrimaryElement}, ${upgradeTime}s)`;

    upgradeBtn.addEventListener("click", async () => {
      upgradeBtn.disabled = true;
      upgradeBtn.textContent = "Đang tiến hành...";
      try {
        await options.onUpgradeBuilding(b.id);
        showFeedback("Đã bắt đầu công việc nâng cấp!", false);
      } catch (err) {
        showFeedback(err instanceof Error ? err.message : "Nâng cấp thất bại");
      } finally {
        upgradeBtn.disabled = false;
        upgradeBtn.textContent = `Nâng cấp Cấp ${nextLevel}`;
      }
    });

    container.appendChild(upgradeBtn);
  } else {
    // Empty tile: Offer options to build
    const instructions = document.createElement("p");
    instructions.style.margin = "0 0 12px 0";
    instructions.style.fontSize = "0.85rem";
    instructions.style.color = "#94a3b8";
    instructions.textContent = "Ô còn trống. Bạn có thể xây dựng một trong các công trình sau:";
    container.appendChild(instructions);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.flexWrap = "wrap";
    btnRow.style.gap = "8px";

    const kinds: BuildingKind[] = ["harvester", "storage"];

    kinds.forEach((kind) => {
      const bDef = BUILDING_DEFINITIONS[kind];
      const cost = getBuildingCost(kind, 1, options.planetPrimaryElement);
      const timeSec = getBuildingTimeSec(kind, 1);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary";
      btn.style.minHeight = "44px";
      btn.style.padding = "8px 12px";
      btn.style.borderRadius = "8px";
      btn.style.backgroundColor = "#0f172a";
      btn.style.border = "1px solid #475569";
      btn.style.color = "#f8fafc";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "0.85rem";
      btn.textContent = `Xây ${bDef.nameVi} (${cost.amount} ${cost.resourceKey}, ${timeSec}s)`;

      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Đang khởi công...";
        try {
          await options.onPlaceBuilding(kind, options.tileX, options.tileY);
          showFeedback(`Đã khởi công xây dựng ${bDef.nameVi}!`, false);
        } catch (err) {
          showFeedback(err instanceof Error ? err.message : "Xây dựng thất bại");
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });

      btnRow.appendChild(btn);
    });

    container.appendChild(btnRow);
  }

  return container;
}
