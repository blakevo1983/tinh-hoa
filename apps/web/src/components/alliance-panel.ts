import type { ElementKey, AllianceBuffResult } from "@tinh-hoa/shared";
import { ELEMENT_KEYS } from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface AllianceMemberView {
  userId: string;
  displayName: string;
  role: "leader" | "officer" | "member";
  primaryElement?: ElementKey;
  joinedAt: string;
}

export interface AllianceViewData {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  level: number;
  memberCap: number;
  members: AllianceMemberView[];
  vaultBalances: Partial<Record<ElementKey, number>>;
  buff: AllianceBuffResult;
}

export interface AlliancePanelOptions {
  currentUserId: string;
  alliance: AllianceViewData | null;
  cooldownUntil?: string | null;
  onCreateAlliance?: (name: string, tag: string) => Promise<void>;
  onDeposit?: (resourceKey: ElementKey, amount: number) => Promise<void>;
  onWithdraw?: (resourceKey: ElementKey, amount: number) => Promise<void>;
  onKick?: (targetUserId: string) => Promise<void>;
  onPromote?: (targetUserId: string, newRole: "officer" | "member") => Promise<void>;
  onTransferLeadership?: (newLeaderId: string) => Promise<void>;
  onLeaveAlliance?: () => Promise<void>;
}

export function createAlliancePanel(options: AlliancePanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card alliance-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("alliance.title"));
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
  title.textContent = t("alliance.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("alliance.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status message
  const statusEl = document.createElement("div");
  statusEl.className = "alliance-status";
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

  // Cooldown warning
  if (options.cooldownUntil && new Date(options.cooldownUntil) > new Date()) {
    const cdNotice = document.createElement("div");
    cdNotice.style.padding = "10px 14px";
    cdNotice.style.borderRadius = "8px";
    cdNotice.style.backgroundColor = "#78350f";
    cdNotice.style.color = "#fde68a";
    cdNotice.style.border = "1px solid #b45309";
    cdNotice.textContent = t("alliance.joinCooldown");
    container.appendChild(cdNotice);
  }

  // Not in alliance
  if (!options.alliance) {
    const noAllianceBox = document.createElement("div");
    noAllianceBox.style.display = "flex";
    noAllianceBox.style.flexDirection = "column";
    noAllianceBox.style.gap = "12px";

    const notice = document.createElement("p");
    notice.style.margin = "0";
    notice.style.color = "#94a3b8";
    notice.textContent = t("alliance.noAlliance");
    noAllianceBox.appendChild(notice);

    const form = document.createElement("form");
    form.className = "create-alliance-form";
    form.style.display = "flex";
    form.style.flexWrap = "wrap";
    form.style.gap = "8px";
    form.style.alignItems = "center";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = t("alliance.namePlaceholder");
    nameInput.setAttribute("aria-label", t("alliance.namePlaceholder"));
    nameInput.style.minHeight = "44px";
    nameInput.style.padding = "8px 12px";
    nameInput.style.borderRadius = "8px";
    nameInput.style.border = "1px solid #475569";
    nameInput.style.backgroundColor = "#0f172a";
    nameInput.style.color = "#f8fafc";
    nameInput.style.flex = "1 1 200px";

    const tagInput = document.createElement("input");
    tagInput.type = "text";
    tagInput.placeholder = t("alliance.tagPlaceholder");
    tagInput.setAttribute("aria-label", t("alliance.tagPlaceholder"));
    tagInput.style.minHeight = "44px";
    tagInput.style.padding = "8px 12px";
    tagInput.style.borderRadius = "8px";
    tagInput.style.border = "1px solid #475569";
    tagInput.style.backgroundColor = "#0f172a";
    tagInput.style.color = "#f8fafc";
    tagInput.style.width = "90px";
    tagInput.maxLength = 5;

    const btnSubmit = document.createElement("button");
    btnSubmit.type = "submit";
    btnSubmit.textContent = t("alliance.btnCreate");
    btnSubmit.style.minHeight = "44px";
    btnSubmit.style.padding = "8px 20px";
    btnSubmit.style.borderRadius = "8px";
    btnSubmit.style.border = "none";
    btnSubmit.style.backgroundColor = "#38bdf8";
    btnSubmit.style.color = "#0f172a";
    btnSubmit.style.fontWeight = "600";
    btnSubmit.style.cursor = "pointer";

    form.appendChild(nameInput);
    form.appendChild(tagInput);
    form.appendChild(btnSubmit);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const tag = tagInput.value.trim().toUpperCase();
      if (name.length < 3 || name.length > 24) {
        setStatus("Tên liên minh phải từ 3 đến 24 ký tự.", true);
        return;
      }
      if (tag.length < 2 || tag.length > 5) {
        setStatus("Tag phải từ 2 đến 5 ký tự.", true);
        return;
      }
      try {
        btnSubmit.disabled = true;
        await options.onCreateAlliance?.(name, tag);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
      } finally {
        btnSubmit.disabled = false;
      }
    };

    noAllianceBox.appendChild(form);
    container.appendChild(noAllianceBox);
    return container;
  }

  // In alliance
  const currentMember = options.alliance.members.find((m) => m.userId === options.currentUserId);
  const currentUserRole = currentMember ? currentMember.role : "member";

  // Alliance Info Bar
  const infoBar = document.createElement("div");
  infoBar.style.padding = "12px";
  infoBar.style.borderRadius = "8px";
  infoBar.style.backgroundColor = "#0f172a";
  infoBar.style.border = "1px solid #334155";
  infoBar.style.display = "flex";
  infoBar.style.justifyContent = "space-between";
  infoBar.style.alignItems = "center";
  infoBar.style.flexWrap = "wrap";
  infoBar.style.gap = "8px";

  const nameTag = document.createElement("div");
  nameTag.style.display = "flex";
  nameTag.style.alignItems = "baseline";
  nameTag.style.gap = "8px";

  const nameEl = document.createElement("span");
  nameEl.style.fontSize = "1.1rem";
  nameEl.style.fontWeight = "bold";
  nameEl.style.color = "#38bdf8";
  nameEl.textContent = options.alliance.name;

  const tagBadge = document.createElement("span");
  tagBadge.style.fontSize = "0.8rem";
  tagBadge.style.padding = "2px 6px";
  tagBadge.style.borderRadius = "4px";
  tagBadge.style.backgroundColor = "#334155";
  tagBadge.style.color = "#f8fafc";
  tagBadge.textContent = `[${options.alliance.tag}]`;

  nameTag.appendChild(nameEl);
  nameTag.appendChild(tagBadge);

  const stats = document.createElement("div");
  stats.style.display = "flex";
  stats.style.gap = "12px";
  stats.style.fontSize = "0.85rem";
  stats.style.color = "#94a3b8";

  const lvlEl = document.createElement("span");
  lvlEl.textContent = t("alliance.level", { level: String(options.alliance.level) });

  const capEl = document.createElement("span");
  capEl.textContent = t("alliance.membersCount", {
    current: String(options.alliance.members.length),
    max: String(options.alliance.memberCap),
  });

  stats.appendChild(lvlEl);
  stats.appendChild(capEl);

  infoBar.appendChild(nameTag);
  infoBar.appendChild(stats);
  container.appendChild(infoBar);

  // Elemental Buff Section
  const buffSection = document.createElement("div");
  buffSection.style.padding = "10px 14px";
  buffSection.style.borderRadius = "8px";
  buffSection.style.backgroundColor = "#0f172a";
  buffSection.style.border = "1px solid #3b82f6";

  const buffTitle = document.createElement("div");
  buffTitle.style.fontWeight = "600";
  buffTitle.style.color = "#60a5fa";
  buffTitle.style.fontSize = "0.95rem";
  const percentBonus = options.alliance.buff.productionBonusPct;
  buffTitle.textContent = t("alliance.elementalBuff", { percent: String(percentBonus) });

  const buffBreakdown = document.createElement("div");
  buffBreakdown.style.fontSize = "0.8rem";
  buffBreakdown.style.color = "#94a3b8";
  buffBreakdown.style.marginTop = "4px";
  buffBreakdown.textContent = options.alliance.buff.descriptionVi;

  buffSection.appendChild(buffTitle);
  buffSection.appendChild(buffBreakdown);
  container.appendChild(buffSection);

  // Vault Section
  const vaultSection = document.createElement("div");
  vaultSection.style.display = "flex";
  vaultSection.style.flexDirection = "column";
  vaultSection.style.gap = "8px";

  const vaultHeader = document.createElement("h4");
  vaultHeader.style.margin = "0";
  vaultHeader.style.color = "#f8fafc";
  vaultHeader.style.fontSize = "1rem";
  vaultHeader.textContent = t("alliance.vaultTitle");
  vaultSection.appendChild(vaultHeader);

  // Vault resource grid
  const vaultGrid = document.createElement("div");
  vaultGrid.style.display = "grid";
  vaultGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(110px, 1fr))";
  vaultGrid.style.gap = "8px";

  for (const elem of ELEMENT_KEYS) {
    const balBox = document.createElement("div");
    balBox.style.padding = "6px 8px";
    balBox.style.borderRadius = "6px";
    balBox.style.backgroundColor = "#0f172a";
    balBox.style.border = "1px solid #334155";
    balBox.style.fontSize = "0.85rem";
    const amount = options.alliance.vaultBalances[elem] ?? 0;
    balBox.textContent = `${elem}: ${amount.toLocaleString()}`;
    vaultGrid.appendChild(balBox);
  }
  vaultSection.appendChild(vaultGrid);

  // Deposit & Withdraw controls
  const vaultControls = document.createElement("div");
  vaultControls.style.display = "flex";
  vaultControls.style.flexWrap = "wrap";
  vaultControls.style.gap = "8px";
  vaultControls.style.alignItems = "center";
  vaultControls.style.marginTop = "4px";

  const elemSelect = document.createElement("select");
  elemSelect.setAttribute("aria-label", "Select element");
  elemSelect.style.minHeight = "44px";
  elemSelect.style.padding = "6px 10px";
  elemSelect.style.borderRadius = "8px";
  elemSelect.style.border = "1px solid #475569";
  elemSelect.style.backgroundColor = "#0f172a";
  elemSelect.style.color = "#f8fafc";

  for (const elem of ELEMENT_KEYS) {
    const opt = document.createElement("option");
    opt.value = elem;
    opt.textContent = elem;
    elemSelect.appendChild(opt);
  }

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.min = "1";
  amountInput.placeholder = t("alliance.amountPlaceholder");
  amountInput.setAttribute("aria-label", t("alliance.amountPlaceholder"));
  amountInput.style.minHeight = "44px";
  amountInput.style.padding = "6px 10px";
  amountInput.style.borderRadius = "8px";
  amountInput.style.border = "1px solid #475569";
  amountInput.style.backgroundColor = "#0f172a";
  amountInput.style.color = "#f8fafc";
  amountInput.style.width = "100px";

  const btnDeposit = document.createElement("button");
  btnDeposit.type = "button";
  btnDeposit.textContent = t("alliance.btnDeposit");
  btnDeposit.style.minHeight = "44px";
  btnDeposit.style.padding = "8px 16px";
  btnDeposit.style.borderRadius = "8px";
  btnDeposit.style.border = "none";
  btnDeposit.style.backgroundColor = "#10b981";
  btnDeposit.style.color = "#0f172a";
  btnDeposit.style.fontWeight = "600";
  btnDeposit.style.cursor = "pointer";

  btnDeposit.onclick = async () => {
    const amount = parseInt(amountInput.value, 10);
    const elem = elemSelect.value as ElementKey;
    if (isNaN(amount) || amount <= 0) {
      setStatus("Số lượng phải lớn hơn 0.", true);
      return;
    }
    try {
      btnDeposit.disabled = true;
      await options.onDeposit?.(elem, amount);
      setStatus(`Đã góp ${amount} ${elem} vào kho chung.`);
      amountInput.value = "";
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnDeposit.disabled = false;
    }
  };

  vaultControls.appendChild(elemSelect);
  vaultControls.appendChild(amountInput);
  vaultControls.appendChild(btnDeposit);

  // Withdraw button (only leader / officer)
  if (currentUserRole === "leader" || currentUserRole === "officer") {
    const btnWithdraw = document.createElement("button");
    btnWithdraw.type = "button";
    btnWithdraw.textContent = t("alliance.btnWithdraw");
    btnWithdraw.style.minHeight = "44px";
    btnWithdraw.style.padding = "8px 16px";
    btnWithdraw.style.borderRadius = "8px";
    btnWithdraw.style.border = "none";
    btnWithdraw.style.backgroundColor = "#f59e0b";
    btnWithdraw.style.color = "#0f172a";
    btnWithdraw.style.fontWeight = "600";
    btnWithdraw.style.cursor = "pointer";

    btnWithdraw.onclick = async () => {
      const amount = parseInt(amountInput.value, 10);
      const elem = elemSelect.value as ElementKey;
      if (isNaN(amount) || amount <= 0) {
        setStatus("Số lượng phải lớn hơn 0.", true);
        return;
      }
      try {
        btnWithdraw.disabled = true;
        await options.onWithdraw?.(elem, amount);
        setStatus(`Đã rút ${amount} ${elem} từ kho chung.`);
        amountInput.value = "";
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), true);
      } finally {
        btnWithdraw.disabled = false;
      }
    };
    vaultControls.appendChild(btnWithdraw);
  }

  vaultSection.appendChild(vaultControls);
  container.appendChild(vaultSection);

  // Members Roster
  const membersSection = document.createElement("div");
  membersSection.style.display = "flex";
  membersSection.style.flexDirection = "column";
  membersSection.style.gap = "8px";

  const membersHeader = document.createElement("h4");
  membersHeader.style.margin = "0";
  membersHeader.style.color = "#f8fafc";
  membersHeader.style.fontSize = "1rem";
  membersHeader.textContent = t("alliance.membersTitle");
  membersSection.appendChild(membersHeader);

  const rosterList = document.createElement("div");
  rosterList.style.display = "flex";
  rosterList.style.flexDirection = "column";
  rosterList.style.gap = "6px";

  for (const member of options.alliance.members) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "8px 12px";
    row.style.borderRadius = "8px";
    row.style.backgroundColor = "#0f172a";
    row.style.border = "1px solid #334155";
    row.style.flexWrap = "wrap";
    row.style.gap = "8px";

    const memInfo = document.createElement("div");
    memInfo.style.display = "flex";
    memInfo.style.alignItems = "center";
    memInfo.style.gap = "8px";

    const nameText = document.createElement("span");
    nameText.style.fontWeight = "600";
    nameText.textContent = member.displayName;

    const roleBadge = document.createElement("span");
    roleBadge.style.fontSize = "0.75rem";
    roleBadge.style.padding = "2px 6px";
    roleBadge.style.borderRadius = "4px";
    if (member.role === "leader") {
      roleBadge.style.backgroundColor = "#dc2626";
      roleBadge.style.color = "#fef2f2";
      roleBadge.textContent = t("alliance.roleLeader");
    } else if (member.role === "officer") {
      roleBadge.style.backgroundColor = "#d97706";
      roleBadge.style.color = "#fffbeb";
      roleBadge.textContent = t("alliance.roleOfficer");
    } else {
      roleBadge.style.backgroundColor = "#475569";
      roleBadge.style.color = "#f8fafc";
      roleBadge.textContent = t("alliance.roleMember");
    }

    memInfo.appendChild(nameText);
    memInfo.appendChild(roleBadge);
    row.appendChild(memInfo);

    // Member Action Buttons (Role check)
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.alignItems = "center";

    const isSelf = member.userId === options.currentUserId;

    if (!isSelf) {
      // Leader can promote/demote
      if (currentUserRole === "leader") {
        if (member.role === "member") {
          const btnPromote = document.createElement("button");
          btnPromote.type = "button";
          btnPromote.textContent = t("alliance.btnPromote");
          btnPromote.style.minHeight = "44px";
          btnPromote.style.padding = "4px 8px";
          btnPromote.style.borderRadius = "6px";
          btnPromote.style.border = "1px solid #3b82f6";
          btnPromote.style.backgroundColor = "transparent";
          btnPromote.style.color = "#60a5fa";
          btnPromote.style.cursor = "pointer";
          btnPromote.onclick = async () => {
            try {
              btnPromote.disabled = true;
              await options.onPromote?.(member.userId, "officer");
            } catch (err) {
              setStatus(err instanceof Error ? err.message : String(err), true);
            } finally {
              btnPromote.disabled = false;
            }
          };
          actions.appendChild(btnPromote);
        } else if (member.role === "officer") {
          const btnDemote = document.createElement("button");
          btnDemote.type = "button";
          btnDemote.textContent = t("alliance.btnDemote");
          btnDemote.style.minHeight = "44px";
          btnDemote.style.padding = "4px 8px";
          btnDemote.style.borderRadius = "6px";
          btnDemote.style.border = "1px solid #f59e0b";
          btnDemote.style.backgroundColor = "transparent";
          btnDemote.style.color = "#fbbf24";
          btnDemote.style.cursor = "pointer";
          btnDemote.onclick = async () => {
            try {
              btnDemote.disabled = true;
              await options.onPromote?.(member.userId, "member");
            } catch (err) {
              setStatus(err instanceof Error ? err.message : String(err), true);
            } finally {
              btnDemote.disabled = false;
            }
          };
          actions.appendChild(btnDemote);
        }

        // Leader can transfer leadership
        const btnTransfer = document.createElement("button");
        btnTransfer.type = "button";
        btnTransfer.textContent = t("alliance.btnTransfer");
        btnTransfer.style.minHeight = "44px";
        btnTransfer.style.padding = "4px 8px";
        btnTransfer.style.borderRadius = "6px";
        btnTransfer.style.border = "1px solid #8b5cf6";
        btnTransfer.style.backgroundColor = "transparent";
        btnTransfer.style.color = "#c084fc";
        btnTransfer.style.cursor = "pointer";
        btnTransfer.onclick = async () => {
          try {
            btnTransfer.disabled = true;
            await options.onTransferLeadership?.(member.userId);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnTransfer.disabled = false;
          }
        };
        actions.appendChild(btnTransfer);
      }

      // Kick logic: leader kicks anyone; officer only kicks member
      const canKick =
        currentUserRole === "leader" || (currentUserRole === "officer" && member.role === "member");

      if (canKick) {
        const btnKick = document.createElement("button");
        btnKick.type = "button";
        btnKick.textContent = t("alliance.btnKick");
        btnKick.style.minHeight = "44px";
        btnKick.style.padding = "4px 8px";
        btnKick.style.borderRadius = "6px";
        btnKick.style.border = "1px solid #ef4444";
        btnKick.style.backgroundColor = "transparent";
        btnKick.style.color = "#f87171";
        btnKick.style.cursor = "pointer";
        btnKick.onclick = async () => {
          try {
            btnKick.disabled = true;
            await options.onKick?.(member.userId);
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          } finally {
            btnKick.disabled = false;
          }
        };
        actions.appendChild(btnKick);
      }
    }

    row.appendChild(actions);
    rosterList.appendChild(row);
  }

  membersSection.appendChild(rosterList);
  container.appendChild(membersSection);

  // Leave Alliance Button
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.marginTop = "8px";

  const btnLeave = document.createElement("button");
  btnLeave.type = "button";
  btnLeave.textContent = t("alliance.btnLeave");
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
      await options.onLeaveAlliance?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnLeave.disabled = false;
    }
  };

  footer.appendChild(btnLeave);
  container.appendChild(footer);

  return container;
}
