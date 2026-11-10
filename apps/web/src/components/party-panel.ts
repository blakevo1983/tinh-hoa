import type { PartyActivityType, PartyRewardDistribution } from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface PartyMemberView {
  userId: string;
  displayName: string;
  contributionScore: number;
  isLeader: boolean;
  joinedAt: string;
}

export interface ActivePartyView {
  id: string;
  leaderId: string;
  title: string;
  activityType: PartyActivityType;
  rewardDistribution: PartyRewardDistribution;
  maxMembers: number;
  members: PartyMemberView[];
  expiresAt: string;
}

export interface OpenPartySummary {
  id: string;
  leaderName: string;
  title: string;
  activityType: PartyActivityType;
  rewardDistribution: PartyRewardDistribution;
  currentMembers: number;
  maxMembers: number;
  expiresAt: string;
}

export interface PartyPanelOptions {
  currentUserId: string;
  activeParty: ActivePartyView | null;
  openParties?: OpenPartySummary[];
  onCreateParty?: (
    title: string,
    activityType: PartyActivityType,
    maxMembers: number,
    distribution: PartyRewardDistribution,
  ) => Promise<void>;
  onJoinParty?: (partyId: string) => Promise<void>;
  onLeaveParty?: (partyId: string) => Promise<void>;
  onDistributeRewards?: (partyId: string) => Promise<void>;
}

export function createPartyPanel(options: PartyPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card party-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("party.title"));
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
  title.textContent = t("party.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("party.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status message
  const statusEl = document.createElement("div");
  statusEl.className = "party-status";
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

  // Active party view
  if (options.activeParty) {
    const isLeader = options.activeParty.leaderId === options.currentUserId;

    // Party summary bar
    const infoBar = document.createElement("div");
    infoBar.style.padding = "12px";
    infoBar.style.borderRadius = "8px";
    infoBar.style.backgroundColor = "#0f172a";
    infoBar.style.border = "1px solid #334155";
    infoBar.style.display = "flex";
    infoBar.style.flexDirection = "column";
    infoBar.style.gap = "8px";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";
    titleRow.style.flexWrap = "wrap";
    titleRow.style.gap = "8px";

    const partyTitle = document.createElement("span");
    partyTitle.style.fontSize = "1.1rem";
    partyTitle.style.fontWeight = "bold";
    partyTitle.style.color = "#38bdf8";
    partyTitle.textContent = options.activeParty.title;

    const badges = document.createElement("div");
    badges.style.display = "flex";
    badges.style.gap = "6px";

    const actBadge = document.createElement("span");
    actBadge.style.fontSize = "0.75rem";
    actBadge.style.padding = "2px 8px";
    actBadge.style.borderRadius = "4px";
    actBadge.style.backgroundColor = "#1e3a8a";
    actBadge.style.color = "#bfdbfe";
    actBadge.textContent = options.activeParty.activityType;

    const distBadge = document.createElement("span");
    distBadge.style.fontSize = "0.75rem";
    distBadge.style.padding = "2px 8px";
    distBadge.style.borderRadius = "4px";
    distBadge.style.backgroundColor = "#065f46";
    distBadge.style.color = "#a7f3d0";
    distBadge.textContent =
      options.activeParty.rewardDistribution === "personal"
        ? t("party.modeIndividual")
        : t("party.modeEqual");

    badges.appendChild(actBadge);
    badges.appendChild(distBadge);
    titleRow.appendChild(partyTitle);
    titleRow.appendChild(badges);
    infoBar.appendChild(titleRow);

    const expiryRow = document.createElement("div");
    expiryRow.style.fontSize = "0.8rem";
    expiryRow.style.color = "#94a3b8";
    const expireDate = new Date(options.activeParty.expiresAt).toLocaleTimeString();
    expiryRow.textContent = t("party.expiresAt", { time: expireDate });
    infoBar.appendChild(expiryRow);

    container.appendChild(infoBar);

    // Members list
    const membersSec = document.createElement("div");
    membersSec.style.display = "flex";
    membersSec.style.flexDirection = "column";
    membersSec.style.gap = "8px";

    const memHeader = document.createElement("h4");
    memHeader.style.margin = "0";
    memHeader.style.fontSize = "1rem";
    memHeader.textContent = t("party.activeMembers", {
      count: String(options.activeParty.members.length),
      max: String(options.activeParty.maxMembers),
    });
    membersSec.appendChild(memHeader);

    const memList = document.createElement("div");
    memList.style.display = "flex";
    memList.style.flexDirection = "column";
    memList.style.gap = "6px";

    for (const mem of options.activeParty.members) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 12px";
      row.style.borderRadius = "8px";
      row.style.backgroundColor = "#0f172a";
      row.style.border = "1px solid #334155";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "8px";

      const name = document.createElement("span");
      name.style.fontWeight = "600";
      name.textContent = mem.displayName;
      left.appendChild(name);

      if (mem.isLeader) {
        const leadBadge = document.createElement("span");
        leadBadge.style.fontSize = "0.75rem";
        leadBadge.style.padding = "2px 6px";
        leadBadge.style.borderRadius = "4px";
        leadBadge.style.backgroundColor = "#dc2626";
        leadBadge.style.color = "#fef2f2";
        leadBadge.textContent = "Leader";
        left.appendChild(leadBadge);
      }

      const score = document.createElement("span");
      score.style.fontSize = "0.85rem";
      score.style.color = "#34d399";
      score.textContent = t("party.contributionScore", { score: String(mem.contributionScore) });

      row.appendChild(left);
      row.appendChild(score);
      memList.appendChild(row);
    }
    membersSec.appendChild(memList);
    container.appendChild(membersSec);

    // Party actions bar
    const actionsBar = document.createElement("div");
    actionsBar.style.display = "flex";
    actionsBar.style.justifyContent = "space-between";
    actionsBar.style.alignItems = "center";
    actionsBar.style.marginTop = "8px";

    const btnLeave = document.createElement("button");
    btnLeave.type = "button";
    btnLeave.textContent = t("party.btnLeave");
    btnLeave.style.minHeight = "44px";
    btnLeave.style.padding = "8px 16px";
    btnLeave.style.borderRadius = "8px";
    btnLeave.style.border = "1px solid #ef4444";
    btnLeave.style.backgroundColor = "#450a0a";
    btnLeave.style.color = "#fca5a5";
    btnLeave.style.fontWeight = "600";
    btnLeave.style.cursor = "pointer";

    btnLeave.onclick = async () => {
      try {
        btnLeave.disabled = true;
        await options.onLeaveParty?.(options.activeParty!.id);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
      } finally {
        btnLeave.disabled = false;
      }
    };
    actionsBar.appendChild(btnLeave);

    if (isLeader) {
      const btnDistribute = document.createElement("button");
      btnDistribute.type = "button";
      btnDistribute.textContent = t("party.btnDistribute");
      btnDistribute.style.minHeight = "44px";
      btnDistribute.style.padding = "8px 16px";
      btnDistribute.style.borderRadius = "8px";
      btnDistribute.style.border = "none";
      btnDistribute.style.backgroundColor = "#10b981";
      btnDistribute.style.color = "#0f172a";
      btnDistribute.style.fontWeight = "600";
      btnDistribute.style.cursor = "pointer";

      btnDistribute.onclick = async () => {
        try {
          btnDistribute.disabled = true;
          await options.onDistributeRewards?.(options.activeParty!.id);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        } finally {
          btnDistribute.disabled = false;
        }
      };
      actionsBar.appendChild(btnDistribute);
    }

    container.appendChild(actionsBar);
    return container;
  }

  // Not in a party: Show Create Form & Open Parties list
  const noPartySec = document.createElement("div");
  noPartySec.style.display = "flex";
  noPartySec.style.flexDirection = "column";
  noPartySec.style.gap = "16px";

  // Create Party Form
  const formBox = document.createElement("div");
  formBox.style.padding = "14px";
  formBox.style.borderRadius = "8px";
  formBox.style.backgroundColor = "#0f172a";
  formBox.style.border = "1px solid #334155";
  formBox.style.display = "flex";
  formBox.style.flexDirection = "column";
  formBox.style.gap = "12px";

  const formHeader = document.createElement("h4");
  formHeader.style.margin = "0";
  formHeader.style.fontSize = "1rem";
  formHeader.textContent = t("party.createTitle");
  formBox.appendChild(formHeader);

  const form = document.createElement("form");
  form.className = "create-party-form";
  form.style.display = "flex";
  form.style.flexWrap = "wrap";
  form.style.gap = "8px";
  form.style.alignItems = "center";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = t("party.titlePlaceholder");
  titleInput.setAttribute("aria-label", t("party.titlePlaceholder"));
  titleInput.style.minHeight = "44px";
  titleInput.style.padding = "8px 12px";
  titleInput.style.borderRadius = "8px";
  titleInput.style.border = "1px solid #475569";
  titleInput.style.backgroundColor = "#1e293b";
  titleInput.style.color = "#f8fafc";
  titleInput.style.flex = "1 1 200px";

  const actSelect = document.createElement("select");
  actSelect.setAttribute("aria-label", "Party activity type");
  actSelect.style.minHeight = "44px";
  actSelect.style.padding = "8px 10px";
  actSelect.style.borderRadius = "8px";
  actSelect.style.border = "1px solid #475569";
  actSelect.style.backgroundColor = "#1e293b";
  actSelect.style.color = "#f8fafc";

  const optExploration = document.createElement("option");
  optExploration.value = "exploration";
  optExploration.textContent = t("party.activityExploration");

  const optBoss = document.createElement("option");
  optBoss.value = "celestial_boss";
  optBoss.textContent = t("party.activityBoss");

  const optPair = document.createElement("option");
  optPair.value = "pair_mission";
  optPair.textContent = t("party.activityPair");

  actSelect.appendChild(optExploration);
  actSelect.appendChild(optBoss);
  actSelect.appendChild(optPair);

  const maxSelect = document.createElement("select");
  maxSelect.setAttribute("aria-label", "Party max members");
  maxSelect.style.minHeight = "44px";
  maxSelect.style.padding = "8px 10px";
  maxSelect.style.borderRadius = "8px";
  maxSelect.style.border = "1px solid #475569";
  maxSelect.style.backgroundColor = "#1e293b";
  maxSelect.style.color = "#f8fafc";

  for (let n = 2; n <= 5; n++) {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `${n} người`;
    if (n === 4) opt.selected = true;
    maxSelect.appendChild(opt);
  }

  const distSelect = document.createElement("select");
  distSelect.setAttribute("aria-label", "Reward distribution mode");
  distSelect.style.minHeight = "44px";
  distSelect.style.padding = "8px 10px";
  distSelect.style.borderRadius = "8px";
  distSelect.style.border = "1px solid #475569";
  distSelect.style.backgroundColor = "#1e293b";
  distSelect.style.color = "#f8fafc";

  const optIndiv = document.createElement("option");
  optIndiv.value = "personal";
  optIndiv.textContent = t("party.modeIndividual");

  const optEq = document.createElement("option");
  optEq.value = "equal";
  optEq.textContent = t("party.modeEqual");

  distSelect.appendChild(optIndiv);
  distSelect.appendChild(optEq);

  const btnCreate = document.createElement("button");
  btnCreate.type = "submit";
  btnCreate.textContent = t("party.btnCreate");
  btnCreate.style.minHeight = "44px";
  btnCreate.style.padding = "8px 18px";
  btnCreate.style.borderRadius = "8px";
  btnCreate.style.border = "none";
  btnCreate.style.backgroundColor = "#38bdf8";
  btnCreate.style.color = "#0f172a";
  btnCreate.style.fontWeight = "600";
  btnCreate.style.cursor = "pointer";

  form.appendChild(titleInput);
  form.appendChild(actSelect);
  form.appendChild(maxSelect);
  form.appendChild(distSelect);
  form.appendChild(btnCreate);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const pTitle = titleInput.value.trim();
    if (pTitle.length < 3 || pTitle.length > 40) {
      setStatus("Tiêu đề nhóm phải từ 3 đến 40 ký tự.", true);
      return;
    }
    const act = actSelect.value as PartyActivityType;
    const max = parseInt(maxSelect.value, 10);
    const dist = distSelect.value as PartyRewardDistribution;
    try {
      btnCreate.disabled = true;
      await options.onCreateParty?.(pTitle, act, max, dist);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnCreate.disabled = false;
    }
  };

  formBox.appendChild(form);
  noPartySec.appendChild(formBox);

  // Open Parties List
  if (options.openParties && options.openParties.length > 0) {
    const openSec = document.createElement("div");
    openSec.style.display = "flex";
    openSec.style.flexDirection = "column";
    openSec.style.gap = "8px";

    const openHeader = document.createElement("h4");
    openHeader.style.margin = "0";
    openHeader.style.fontSize = "1rem";
    openHeader.textContent = "Nhóm Đang Tuyển Người";
    openSec.appendChild(openHeader);

    for (const p of options.openParties) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "10px 14px";
      row.style.borderRadius = "8px";
      row.style.backgroundColor = "#0f172a";
      row.style.border = "1px solid #334155";
      row.style.flexWrap = "wrap";
      row.style.gap = "8px";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "4px";

      const tText = document.createElement("span");
      tText.style.fontWeight = "600";
      tText.textContent = p.title;

      const subText = document.createElement("span");
      subText.style.fontSize = "0.8rem";
      subText.style.color = "#94a3b8";
      subText.textContent = `Thủ lĩnh: ${p.leaderName} | ${p.activityType} (${p.currentMembers}/${p.maxMembers})`;

      left.appendChild(tText);
      left.appendChild(subText);

      const btnJoin = document.createElement("button");
      btnJoin.type = "button";
      btnJoin.textContent = t("party.btnJoin");
      btnJoin.style.minHeight = "44px";
      btnJoin.style.padding = "8px 16px";
      btnJoin.style.borderRadius = "8px";
      btnJoin.style.border = "none";
      btnJoin.style.backgroundColor = "#10b981";
      btnJoin.style.color = "#0f172a";
      btnJoin.style.fontWeight = "600";
      btnJoin.style.cursor = "pointer";

      btnJoin.onclick = async () => {
        try {
          btnJoin.disabled = true;
          await options.onJoinParty?.(p.id);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        } finally {
          btnJoin.disabled = false;
        }
      };

      row.appendChild(left);
      row.appendChild(btnJoin);
      openSec.appendChild(row);
    }

    noPartySec.appendChild(openSec);
  }

  container.appendChild(noPartySec);
  return container;
}
