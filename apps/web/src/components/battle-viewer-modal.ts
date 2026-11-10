import type { BattleResult } from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface BattleViewerModalOptions {
  battleResult: BattleResult;
  attackerName: string;
  defenderName: string;
  onClose: () => void;
}

export function createBattleViewerModal(options: BattleViewerModalOptions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay battle-viewer-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "battle-modal-title");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "1000";
  overlay.style.padding = "16px";

  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.style.maxWidth = "550px";
  modal.style.width = "100%";
  modal.style.maxHeight = "85vh";
  modal.style.overflowY = "auto";
  modal.style.backgroundColor = "#1e293b";
  modal.style.border = "1px solid #475569";
  modal.style.borderRadius = "12px";
  modal.style.padding = "20px";
  modal.style.color = "#f8fafc";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.gap = "14px";

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";

  const title = document.createElement("h3");
  title.id = "battle-modal-title";
  title.style.margin = "0";
  title.style.fontSize = "1.2rem";
  title.style.color = options.battleResult.winnerSide === "attacker" ? "#34d399" : "#f87171";
  title.textContent =
    options.battleResult.winnerSide === "attacker" ? t("warfare.victory") : t("warfare.defeat");

  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.textContent = "✕ Đóng";
  btnClose.setAttribute("aria-label", "Close modal");
  btnClose.style.minHeight = "44px";
  btnClose.style.minWidth = "44px";
  btnClose.style.padding = "8px 14px";
  btnClose.style.borderRadius = "8px";
  btnClose.style.border = "1px solid #475569";
  btnClose.style.backgroundColor = "transparent";
  btnClose.style.color = "#94a3b8";
  btnClose.style.cursor = "pointer";
  btnClose.onclick = options.onClose;

  header.appendChild(title);
  header.appendChild(btnClose);
  modal.appendChild(header);

  // HP Summary box
  const hpBox = document.createElement("div");
  hpBox.style.display = "flex";
  hpBox.style.justifyContent = "space-between";
  hpBox.style.padding = "10px 14px";
  hpBox.style.borderRadius = "8px";
  hpBox.style.backgroundColor = "#0f172a";
  hpBox.style.border = "1px solid #334155";
  hpBox.style.fontSize = "0.9rem";

  const atkHp = document.createElement("span");
  atkHp.textContent = `${options.attackerName}: ${options.battleResult.attackerRemainingHp} HP`;
  const defHp = document.createElement("span");
  defHp.textContent = `${options.defenderName}: ${options.battleResult.defenderRemainingHp} HP`;

  hpBox.appendChild(atkHp);
  hpBox.appendChild(defHp);
  modal.appendChild(hpBox);

  // Rounds Log
  const logBox = document.createElement("div");
  logBox.style.maxHeight = "240px";
  logBox.style.overflowY = "auto";
  logBox.style.padding = "10px";
  logBox.style.borderRadius = "8px";
  logBox.style.backgroundColor = "#0f172a";
  logBox.style.border = "1px solid #334155";
  logBox.style.display = "flex";
  logBox.style.flexDirection = "column";
  logBox.style.gap = "6px";
  logBox.style.fontSize = "0.85rem";

  for (const round of options.battleResult.rounds) {
    const row = document.createElement("div");
    row.style.color = round.isCritical
      ? "#fde047"
      : round.elementalMultiplier > 1
        ? "#60a5fa"
        : "#94a3b8";
    row.textContent = `[H${round.roundNumber}] ${round.descriptionVi}`;
    logBox.appendChild(row);
  }
  modal.appendChild(logBox);

  // Assimilated Gene note
  if (options.battleResult.assimilatedGene) {
    const geneBox = document.createElement("div");
    geneBox.style.padding = "10px 14px";
    geneBox.style.borderRadius = "8px";
    geneBox.style.backgroundColor = "#1e1b4b";
    geneBox.style.border = "1px solid #4338ca";
    geneBox.style.color = "#c7d2fe";
    geneBox.style.fontSize = "0.85rem";
    geneBox.textContent = t("warfare.geneAssimilated", {
      element: options.battleResult.assimilatedGene.element,
      val: String(options.battleResult.assimilatedGene.bonusValue),
      stat: options.battleResult.assimilatedGene.bonusStatKey,
    });
    modal.appendChild(geneBox);
  }

  overlay.appendChild(modal);
  return overlay;
}
