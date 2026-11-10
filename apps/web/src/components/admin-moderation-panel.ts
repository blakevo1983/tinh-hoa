/**
 * Admin Moderation & Operations Panel Component
 * Cho phép người kiểm duyệt xem các báo cáo vi phạm, bỏ qua hoặc xử phạt mute/ban.
 * Tuân thủ Rule 25: Accessible, phím Esc đóng modal, min touch target 44px, tương phản >= 4.5:1.
 */

import { t } from "../i18n/index.js";

export interface ChatReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  messageId?: string;
  messageContent?: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
}

export interface AdminModerationPanelOptions {
  reports: ChatReportItem[];
  onDismissReport?: (reportId: string) => Promise<void>;
  onMuteUser?: (userId: string, durationSeconds: number) => Promise<void>;
  onBanUser?: (userId: string) => Promise<void>;
  onClose?: () => void;
}

export interface AdminModerationPanelHandle {
  element: HTMLElement;
  setReports: (reports: ChatReportItem[]) => void;
  destroy: () => void;
}

export function createAdminModerationPanel(
  options: AdminModerationPanelOptions,
): AdminModerationPanelHandle {
  let reports = [...options.reports];
  let filter: "all" | "pending" | "resolved" = "pending";

  const overlay = document.createElement("div");
  overlay.className = "admin-moderation-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "moderation-panel-title");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15, 23, 42, 0.85)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  overlay.style.padding = "16px";

  const card = document.createElement("div");
  card.className = "admin-moderation-card";
  card.style.background = "#1e293b";
  card.style.border = "1px solid #334155";
  card.style.borderRadius = "16px";
  card.style.width = "100%";
  card.style.maxWidth = "800px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.overflow = "hidden";
  overlay.appendChild(card);

  // Header
  const header = document.createElement("div");
  header.style.padding = "20px 24px";
  header.style.borderBottom = "1px solid #334155";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.background = "#0f172a";

  const headerLeft = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "moderation-panel-title";
  title.style.margin = "0 0 4px";
  title.style.fontSize = "1.25rem";
  title.style.color = "#38bdf8";
  title.textContent = `🛡️ ${t("moderation.title")}`;

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.875rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("moderation.subtitle");

  headerLeft.appendChild(title);
  headerLeft.appendChild(subtitle);
  header.appendChild(headerLeft);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close-mod";
  closeBtn.setAttribute("aria-label", "Đóng");
  closeBtn.textContent = "✕";
  closeBtn.style.minWidth = "44px";
  closeBtn.style.minHeight = "44px";
  closeBtn.style.cursor = "pointer";
  header.appendChild(closeBtn);
  card.appendChild(header);

  // Banner
  const banner = document.createElement("div");
  banner.className = "mod-message-banner";
  banner.style.display = "none";
  banner.style.padding = "12px 24px";
  banner.style.fontSize = "0.875rem";
  card.appendChild(banner);

  function showNotification(msg: string, isError = false) {
    banner.textContent = msg;
    banner.style.display = "block";
    banner.style.backgroundColor = isError ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)";
    banner.style.color = isError ? "#fca5a5" : "#6ee7b7";
  }

  // Filter Tabs
  const tabContainer = document.createElement("div");
  tabContainer.style.padding = "12px 24px";
  tabContainer.style.display = "flex";
  tabContainer.style.gap = "8px";
  tabContainer.style.borderBottom = "1px solid #334155";
  tabContainer.style.background = "#1e293b";
  card.appendChild(tabContainer);

  const pendingTab = document.createElement("button");
  pendingTab.type = "button";
  pendingTab.className = "tab-btn";
  pendingTab.dataset.filter = "pending";
  pendingTab.style.minHeight = "44px";
  pendingTab.style.padding = "8px 16px";
  pendingTab.style.cursor = "pointer";

  const resolvedTab = document.createElement("button");
  resolvedTab.type = "button";
  resolvedTab.className = "tab-btn";
  resolvedTab.dataset.filter = "resolved";
  resolvedTab.style.minHeight = "44px";
  resolvedTab.style.padding = "8px 16px";
  resolvedTab.style.cursor = "pointer";

  const allTab = document.createElement("button");
  allTab.type = "button";
  allTab.className = "tab-btn";
  allTab.dataset.filter = "all";
  allTab.style.minHeight = "44px";
  allTab.style.padding = "8px 16px";
  allTab.style.cursor = "pointer";

  tabContainer.appendChild(pendingTab);
  tabContainer.appendChild(resolvedTab);
  tabContainer.appendChild(allTab);

  // List Container
  const listContainer = document.createElement("div");
  listContainer.className = "mod-reports-container";
  listContainer.style.padding = "20px 24px";
  listContainer.style.display = "flex";
  listContainer.style.flexDirection = "column";
  listContainer.style.gap = "16px";
  card.appendChild(listContainer);

  function renderList(): void {
    pendingTab.textContent = `${t("moderation.statusPending")} (${reports.filter((r) => r.status === "pending").length})`;
    resolvedTab.textContent = t("moderation.statusResolved");
    allTab.textContent = `Tất cả (${reports.length})`;

    // Clear list
    while (listContainer.firstChild) {
      listContainer.removeChild(listContainer.firstChild);
    }

    const filtered = reports.filter((r) => {
      if (filter === "pending") return r.status === "pending";
      if (filter === "resolved") return r.status === "resolved" || r.status === "dismissed";
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-notice";
      empty.style.textAlign = "center";
      empty.style.color = "#94a3b8";
      empty.style.padding = "32px 0";
      empty.textContent = `✨ ${t("moderation.noReports")}`;
      listContainer.appendChild(empty);
      return;
    }

    for (const report of filtered) {
      const itemCard = document.createElement("div");
      itemCard.className = "report-item-card";
      itemCard.dataset.reportId = report.id;
      itemCard.style.background = "#0f172a";
      itemCard.style.border = "1px solid #334155";
      itemCard.style.borderRadius = "12px";
      itemCard.style.padding = "16px";
      itemCard.style.display = "flex";
      itemCard.style.flexDirection = "column";
      itemCard.style.gap = "12px";

      // Meta
      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.justifyContent = "space-between";

      const userInfo = document.createElement("div");
      const reportedSpan = document.createElement("span");
      reportedSpan.style.fontWeight = "600";
      reportedSpan.style.color = "#f87171";
      reportedSpan.textContent = `${t("moderation.reportedUser")}: ${report.reportedUserName ?? report.reportedUserId}`;

      const reporterSpan = document.createElement("span");
      reporterSpan.style.color = "#64748b";
      reporterSpan.style.fontSize = "0.8rem";
      reporterSpan.style.marginLeft = "8px";
      reporterSpan.textContent = `(${t("moderation.reporter")}: ${report.reporterName ?? report.reporterId})`;

      userInfo.appendChild(reportedSpan);
      userInfo.appendChild(reporterSpan);
      meta.appendChild(userInfo);

      const statusBadge = document.createElement("span");
      statusBadge.className = "report-status-badge";
      statusBadge.textContent =
        report.status === "pending"
          ? t("moderation.statusPending")
          : report.status === "resolved"
            ? t("moderation.statusResolved")
            : t("moderation.statusDismissed");
      meta.appendChild(statusBadge);
      itemCard.appendChild(meta);

      // Reason & Content
      const reasonBox = document.createElement("div");
      reasonBox.style.background = "rgba(30, 41, 59, 0.7)";
      reasonBox.style.padding = "10px 14px";
      reasonBox.style.borderRadius = "8px";

      const reasonText = document.createElement("div");
      reasonText.textContent = `${t("moderation.reason")}: ${report.reason}`;
      reasonBox.appendChild(reasonText);

      if (report.messageContent) {
        const msgText = document.createElement("div");
        msgText.style.color = "#94a3b8";
        msgText.style.fontStyle = "italic";
        msgText.textContent = `"${report.messageContent}"`;
        reasonBox.appendChild(msgText);
      }
      itemCard.appendChild(reasonBox);

      // Action Buttons (if pending)
      if (report.status === "pending") {
        const actionRow = document.createElement("div");
        actionRow.style.display = "flex";
        actionRow.style.gap = "8px";

        const dismissBtn = document.createElement("button");
        dismissBtn.type = "button";
        dismissBtn.className = "btn-act-dismiss";
        dismissBtn.dataset.id = report.id;
        dismissBtn.style.minHeight = "44px";
        dismissBtn.textContent = t("moderation.btnDismiss");
        dismissBtn.addEventListener("click", async () => {
          try {
            await options.onDismissReport?.(report.id);
            report.status = "dismissed";
            showNotification(t("moderation.actionSuccess"));
            renderList();
          } catch {
            showNotification("Lỗi khi thực hiện thao tác.", true);
          }
        });
        actionRow.appendChild(dismissBtn);

        const mute1hBtn = document.createElement("button");
        mute1hBtn.type = "button";
        mute1hBtn.className = "btn-act-mute-1h";
        mute1hBtn.dataset.id = report.id;
        mute1hBtn.style.minHeight = "44px";
        mute1hBtn.textContent = t("moderation.btnMute1h");
        mute1hBtn.addEventListener("click", async () => {
          try {
            await options.onMuteUser?.(report.reportedUserId, 3600);
            report.status = "resolved";
            showNotification(t("moderation.actionSuccess"));
            renderList();
          } catch {
            showNotification("Lỗi khi cấm chat 1 giờ.", true);
          }
        });
        actionRow.appendChild(mute1hBtn);

        const mute24hBtn = document.createElement("button");
        mute24hBtn.type = "button";
        mute24hBtn.className = "btn-act-mute-24h";
        mute24hBtn.dataset.id = report.id;
        mute24hBtn.style.minHeight = "44px";
        mute24hBtn.textContent = t("moderation.btnMute24h");
        mute24hBtn.addEventListener("click", async () => {
          try {
            await options.onMuteUser?.(report.reportedUserId, 86400);
            report.status = "resolved";
            showNotification(t("moderation.actionSuccess"));
            renderList();
          } catch {
            showNotification("Lỗi khi cấm chat 24 giờ.", true);
          }
        });
        actionRow.appendChild(mute24hBtn);

        const banBtn = document.createElement("button");
        banBtn.type = "button";
        banBtn.className = "btn-act-ban";
        banBtn.dataset.id = report.id;
        banBtn.style.minHeight = "44px";
        banBtn.textContent = t("moderation.btnBan");
        banBtn.addEventListener("click", async () => {
          try {
            await options.onBanUser?.(report.reportedUserId);
            report.status = "resolved";
            showNotification(t("moderation.actionSuccess"));
            renderList();
          } catch {
            showNotification("Lỗi khi khóa tài khoản.", true);
          }
        });
        actionRow.appendChild(banBtn);

        itemCard.appendChild(actionRow);
      }

      listContainer.appendChild(itemCard);
    }
  }

  pendingTab.addEventListener("click", () => {
    filter = "pending";
    renderList();
  });
  resolvedTab.addEventListener("click", () => {
    filter = "resolved";
    renderList();
  });
  allTab.addEventListener("click", () => {
    filter = "all";
    renderList();
  });

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      destroy();
      options.onClose?.();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEsc);
  }

  function destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleEsc);
    }
    overlay.remove?.();
  }

  closeBtn.addEventListener("click", () => {
    destroy();
    options.onClose?.();
  });

  renderList();

  return {
    element: overlay,
    setReports: (newReports: ChatReportItem[]) => {
      reports = [...newReports];
      renderList();
    },
    destroy,
  };
}
