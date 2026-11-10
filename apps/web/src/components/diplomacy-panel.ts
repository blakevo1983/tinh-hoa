import type {
  AllianceDiplomacyAction,
  AllianceDiplomacyRecord,
  AllianceDiplomacyStatus,
} from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface OtherAllianceSummary {
  id: string;
  name: string;
  tag: string;
  level: number;
}

export interface DiplomacyPanelOptions {
  myAllianceId: string;
  isLeader: boolean;
  otherAlliances: OtherAllianceSummary[];
  diplomacyRecords: AllianceDiplomacyRecord[];
  onProposeDiplomacy?: (targetAllianceId: string, action: AllianceDiplomacyAction) => Promise<void>;
  onRespondDiplomacy?: (targetAllianceId: string, accept: boolean) => Promise<void>;
}

export function createDiplomacyPanel(options: DiplomacyPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card diplomacy-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("diplomacy.title"));
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
  title.textContent = t("diplomacy.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("diplomacy.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status message
  const statusEl = document.createElement("div");
  statusEl.className = "diplomacy-status";
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

  if (!options.isLeader) {
    const leaderNotice = document.createElement("div");
    leaderNotice.style.padding = "10px 14px";
    leaderNotice.style.borderRadius = "8px";
    leaderNotice.style.backgroundColor = "#1e293b";
    leaderNotice.style.color = "#94a3b8";
    leaderNotice.style.border = "1px solid #475569";
    leaderNotice.style.fontSize = "0.85rem";
    leaderNotice.textContent = t("diplomacy.onlyLeaderCanAct");
    container.appendChild(leaderNotice);
  }

  // Alliances list
  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "10px";

  for (const target of options.otherAlliances) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "12px 14px";
    row.style.borderRadius = "8px";
    row.style.backgroundColor = "#0f172a";
    row.style.border = "1px solid #334155";
    row.style.flexWrap = "wrap";
    row.style.gap = "8px";

    // Left info
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";

    const nameText = document.createElement("span");
    nameText.style.fontWeight = "bold";
    nameText.style.color = "#f8fafc";
    nameText.textContent = `${target.name} [${target.tag}]`;

    // Find diplomacy record
    const pairA = options.myAllianceId < target.id ? options.myAllianceId : target.id;
    const pairB = options.myAllianceId < target.id ? target.id : options.myAllianceId;

    const relRecord = options.diplomacyRecords.find(
      (r) => r.allianceA === pairA && r.allianceB === pairB,
    );
    const relStatus: AllianceDiplomacyStatus = relRecord ? relRecord.status : "neutral";

    const badge = document.createElement("span");
    badge.style.fontSize = "0.75rem";
    badge.style.padding = "2px 8px";
    badge.style.borderRadius = "4px";

    if (relStatus === "allied") {
      badge.style.backgroundColor = "#065f46";
      badge.style.color = "#a7f3d0";
      badge.textContent = t("diplomacy.statusAllied");
    } else if (relStatus === "hostile") {
      badge.style.backgroundColor = "#991b1b";
      badge.style.color = "#fecaca";
      badge.textContent = t("diplomacy.statusHostile");
    } else if (relStatus === "pending_alliance") {
      badge.style.backgroundColor = "#854d0e";
      badge.style.color = "#fef08a";
      badge.textContent = t("diplomacy.statusPending");
    } else {
      badge.style.backgroundColor = "#334155";
      badge.style.color = "#94a3b8";
      badge.textContent = t("diplomacy.statusNeutral");
    }

    left.appendChild(nameText);
    left.appendChild(badge);
    row.appendChild(left);

    // Actions (Only for Leader)
    if (options.isLeader) {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.style.alignItems = "center";

      // Pending response logic
      if (relStatus === "pending_alliance" && relRecord?.proposedByAllianceId === target.id) {
        const btnAccept = document.createElement("button");
        btnAccept.type = "button";
        btnAccept.textContent = t("diplomacy.btnAccept");
        btnAccept.style.minHeight = "44px";
        btnAccept.style.padding = "6px 12px";
        btnAccept.style.borderRadius = "6px";
        btnAccept.style.border = "none";
        btnAccept.style.backgroundColor = "#10b981";
        btnAccept.style.color = "#0f172a";
        btnAccept.style.fontWeight = "600";
        btnAccept.style.cursor = "pointer";
        btnAccept.onclick = async () => {
          try {
            btnAccept.disabled = true;
            await options.onRespondDiplomacy?.(target.id, true);
            setStatus(`Đã chấp thuận đồng minh với ${target.name}!`);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnAccept.disabled = false;
          }
        };

        const btnReject = document.createElement("button");
        btnReject.type = "button";
        btnReject.textContent = t("diplomacy.btnReject");
        btnReject.style.minHeight = "44px";
        btnReject.style.padding = "6px 12px";
        btnReject.style.borderRadius = "6px";
        btnReject.style.border = "1px solid #ef4444";
        btnReject.style.backgroundColor = "transparent";
        btnReject.style.color = "#f87171";
        btnReject.style.cursor = "pointer";
        btnReject.onclick = async () => {
          try {
            btnReject.disabled = true;
            await options.onRespondDiplomacy?.(target.id, false);
            setStatus(`Đã từ chối đề xuất của ${target.name}.`);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnReject.disabled = false;
          }
        };

        actions.appendChild(btnAccept);
        actions.appendChild(btnReject);
      } else if (relStatus === "neutral") {
        const btnPropose = document.createElement("button");
        btnPropose.type = "button";
        btnPropose.textContent = t("diplomacy.btnProposeAlliance");
        btnPropose.style.minHeight = "44px";
        btnPropose.style.padding = "6px 10px";
        btnPropose.style.borderRadius = "6px";
        btnPropose.style.border = "1px solid #10b981";
        btnPropose.style.backgroundColor = "transparent";
        btnPropose.style.color = "#34d399";
        btnPropose.style.cursor = "pointer";
        btnPropose.onclick = async () => {
          try {
            btnPropose.disabled = true;
            await options.onProposeDiplomacy?.(target.id, "propose_alliance");
            setStatus(`Đã gửi đề xuất đồng minh đến ${target.name}!`);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnPropose.disabled = false;
          }
        };

        const btnHostile = document.createElement("button");
        btnHostile.type = "button";
        btnHostile.textContent = t("diplomacy.btnDeclareHostile");
        btnHostile.style.minHeight = "44px";
        btnHostile.style.padding = "6px 10px";
        btnHostile.style.borderRadius = "6px";
        btnHostile.style.border = "1px solid #ef4444";
        btnHostile.style.backgroundColor = "transparent";
        btnHostile.style.color = "#f87171";
        btnHostile.style.cursor = "pointer";
        btnHostile.onclick = async () => {
          try {
            btnHostile.disabled = true;
            await options.onProposeDiplomacy?.(target.id, "declare_hostility");
            setStatus(`Đã tuyên bố thù địch với ${target.name}!`);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnHostile.disabled = false;
          }
        };

        actions.appendChild(btnPropose);
        actions.appendChild(btnHostile);
      } else {
        // allied or hostile -> can broker neutral
        const btnNeutral = document.createElement("button");
        btnNeutral.type = "button";
        btnNeutral.textContent = t("diplomacy.btnDeclareNeutral");
        btnNeutral.style.minHeight = "44px";
        btnNeutral.style.padding = "6px 10px";
        btnNeutral.style.borderRadius = "6px";
        btnNeutral.style.border = "1px solid #64748b";
        btnNeutral.style.backgroundColor = "transparent";
        btnNeutral.style.color = "#cbd5e1";
        btnNeutral.style.cursor = "pointer";
        btnNeutral.onclick = async () => {
          try {
            btnNeutral.disabled = true;
            await options.onProposeDiplomacy?.(target.id, "declare_neutral");
            setStatus(`Đã khôi phục quan hệ trung lập với ${target.name}.`);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnNeutral.disabled = false;
          }
        };
        actions.appendChild(btnNeutral);
      }

      row.appendChild(actions);
    }

    list.appendChild(row);
  }

  container.appendChild(list);
  return container;
}
