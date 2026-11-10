import type { NpcPlanet, PlanetExpedition } from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface ExpeditionPanelOptions {
  planetId: string;
  planetStage: number;
  hasObservatory: boolean;
  activeExpedition: PlanetExpedition | null;
  npcPlanets: NpcPlanet[];
  onStartExpedition?: (targetNpcId: string) => Promise<void>;
  onSettleExpedition?: (expeditionId: string) => Promise<void>;
}

export function createExpeditionPanel(options: ExpeditionPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card expedition-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("expedition.title"));
  container.style.marginTop = "16px";
  container.style.padding = "16px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.color = "#f8fafc";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  // Header
  const header = document.createElement("div");
  const title = document.createElement("h3");
  title.style.margin = "0 0 4px 0";
  title.style.fontSize = "1.2rem";
  title.style.color = "#38bdf8";
  title.textContent = t("expedition.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("expedition.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status feedback bar
  const statusEl = document.createElement("div");
  statusEl.className = "expedition-status";
  statusEl.style.display = "none";
  statusEl.style.padding = "10px 14px";
  statusEl.style.borderRadius = "8px";
  statusEl.style.fontSize = "0.9rem";
  container.appendChild(statusEl);

  function setStatus(msg: string, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.display = "block";
    statusEl.style.backgroundColor = isError ? "#450a0a" : "#064e3b";
    statusEl.style.color = isError ? "#fca5a5" : "#6ee7b7";
    statusEl.style.border = `1px solid ${isError ? "#991b1b" : "#059669"}`;
  }

  // Pre-requisite check: Stage 4 & Observatory
  if (options.planetStage < 4 || !options.hasObservatory) {
    const lockNotice = document.createElement("div");
    lockNotice.style.padding = "14px";
    lockNotice.style.borderRadius = "8px";
    lockNotice.style.backgroundColor = "#1e1b4b";
    lockNotice.style.color = "#c7d2fe";
    lockNotice.style.border = "1px solid #4338ca";
    lockNotice.textContent = t("expedition.observatoryRequired");
    container.appendChild(lockNotice);
    return container;
  }

  // Active expedition tracker
  if (options.activeExpedition && options.activeExpedition.status === "in_progress") {
    const trackerBox = document.createElement("div");
    trackerBox.style.padding = "14px";
    trackerBox.style.borderRadius = "8px";
    trackerBox.style.backgroundColor = "#0f172a";
    trackerBox.style.border = "1px solid #38bdf8";
    trackerBox.style.display = "flex";
    trackerBox.style.flexDirection = "column";
    trackerBox.style.gap = "8px";

    const targetNpc = options.npcPlanets.find(
      (n) => n.id === options.activeExpedition?.targetNpcId,
    );
    const targetName = targetNpc ? targetNpc.name : "Hành tinh xa xôi";

    const statusTitle = document.createElement("div");
    statusTitle.style.fontWeight = "bold";
    statusTitle.style.color = "#38bdf8";
    statusTitle.textContent = t("expedition.targetPlanet", { name: targetName });
    trackerBox.appendChild(statusTitle);

    const isReady = new Date(options.activeExpedition.finishAt) <= new Date();

    const descEl = document.createElement("div");
    descEl.style.fontSize = "0.85rem";
    descEl.style.color = isReady ? "#34d399" : "#94a3b8";
    descEl.textContent = isReady
      ? "Tàu thăm dò đã trở về an toàn với đầy đủ mẫu vật!"
      : t("expedition.statusInProgress");
    trackerBox.appendChild(descEl);

    if (isReady) {
      const btnSettle = document.createElement("button");
      btnSettle.type = "button";
      btnSettle.textContent = t("expedition.btnSettle");
      btnSettle.style.minHeight = "44px";
      btnSettle.style.padding = "8px 18px";
      btnSettle.style.borderRadius = "8px";
      btnSettle.style.border = "none";
      btnSettle.style.backgroundColor = "#10b981";
      btnSettle.style.color = "#0f172a";
      btnSettle.style.fontWeight = "600";
      btnSettle.style.cursor = "pointer";

      btnSettle.onclick = async () => {
        try {
          btnSettle.disabled = true;
          await options.onSettleExpedition?.(options.activeExpedition!.id);
          setStatus("Đã tiếp nhận phần thưởng viễn chinh thành công!");
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        } finally {
          btnSettle.disabled = false;
        }
      };
      trackerBox.appendChild(btnSettle);
    }

    container.appendChild(trackerBox);
    return container;
  }

  // NPC planets list for launching probes
  const listContainer = document.createElement("div");
  listContainer.style.display = "flex";
  listContainer.style.flexDirection = "column";
  listContainer.style.gap = "10px";

  for (const npc of options.npcPlanets) {
    const card = document.createElement("div");
    card.style.display = "flex";
    card.style.justifyContent = "space-between";
    card.style.alignItems = "center";
    card.style.padding = "12px 14px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = "#0f172a";
    card.style.border = "1px solid #334155";
    card.style.flexWrap = "wrap";
    card.style.gap = "8px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "4px";

    const titleEl = document.createElement("span");
    titleEl.style.fontWeight = "bold";
    titleEl.style.color = "#f8fafc";
    titleEl.textContent = `${npc.name} (${npc.element})`;

    const subEl = document.createElement("span");
    subEl.style.fontSize = "0.8rem";
    subEl.style.color = "#94a3b8";
    subEl.textContent = `${t("expedition.personality", { personality: npc.personality })} | Tọa độ: [${npc.coordX}, ${npc.coordY}]`;

    left.appendChild(titleEl);
    left.appendChild(subEl);

    const btnLaunch = document.createElement("button");
    btnLaunch.type = "button";
    btnLaunch.textContent = t("expedition.btnLaunch");
    btnLaunch.style.minHeight = "44px";
    btnLaunch.style.padding = "8px 16px";
    btnLaunch.style.borderRadius = "8px";
    btnLaunch.style.border = "none";
    btnLaunch.style.backgroundColor = "#38bdf8";
    btnLaunch.style.color = "#0f172a";
    btnLaunch.style.fontWeight = "600";
    btnLaunch.style.cursor = "pointer";

    btnLaunch.onclick = async () => {
      try {
        btnLaunch.disabled = true;
        await options.onStartExpedition?.(npc.id);
        setStatus(`Đã phóng tàu thám hiểm đến ${npc.name}!`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
      } finally {
        btnLaunch.disabled = false;
      }
    };

    card.appendChild(left);
    card.appendChild(btnLaunch);
    listContainer.appendChild(card);
  }

  container.appendChild(listContainer);
  return container;
}
