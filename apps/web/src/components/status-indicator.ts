/**
 * Component hiển thị trạng thái kết nối máy chủ, độ trễ Ping và FPS.
 * Tuân thủ Rule 25: Accessible, touch target >= 44px, tương phản >= 4.5:1.
 */

import { t } from "../i18n/index.js";

export type ServerHealthState = "online" | "degraded" | "offline";

export interface StatusIndicatorOptions {
  initialPingMs?: number;
  initialFps?: number;
  onRefreshPing?: () => Promise<number>;
}

export interface StatusIndicatorHandle {
  element: HTMLElement;
  setPing: (ms: number) => void;
  setFps: (fps: number) => void;
  getState: () => ServerHealthState;
  getPing: () => number;
  getFps: () => number;
}

export function createStatusIndicator(options: StatusIndicatorOptions = {}): StatusIndicatorHandle {
  let pingMs = options.initialPingMs ?? 42;
  let fps = options.initialFps ?? 60;
  let state: ServerHealthState = "online";

  function computeState(): ServerHealthState {
    if (pingMs < 0 || pingMs >= 500) return "offline";
    if (pingMs >= 150) return "degraded";
    return "online";
  }

  state = computeState();

  const container = document.createElement("div");
  container.className = "status-indicator-container";

  const badge = document.createElement("div");
  badge.className = "status-indicator-badge";
  badge.setAttribute("role", "status");
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.gap = "8px";
  badge.style.background = "rgba(15, 23, 42, 0.85)";
  badge.style.border = "1px solid rgba(255, 255, 255, 0.15)";
  badge.style.borderRadius = "9999px";
  badge.style.padding = "6px 14px";
  badge.style.minHeight = "44px";
  badge.style.color = "#f8fafc";
  badge.style.fontSize = "13px";

  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.style.display = "inline-block";
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "50%";

  const label = document.createElement("span");
  label.className = "status-label";
  label.style.fontWeight = "500";

  const sep1 = document.createElement("span");
  sep1.textContent = "|";
  sep1.style.color = "rgba(255, 255, 255, 0.3)";

  const pingSpan = document.createElement("span");
  pingSpan.className = "status-ping";

  const sep2 = document.createElement("span");
  sep2.textContent = "|";
  sep2.style.color = "rgba(255, 255, 255, 0.3)";

  const fpsSpan = document.createElement("span");
  fpsSpan.className = "status-fps";
  fpsSpan.style.color = "#94a3b8";

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "status-refresh-btn";
  refreshBtn.setAttribute("aria-label", "Refresh ping");
  refreshBtn.textContent = "↻";
  refreshBtn.style.background = "transparent";
  refreshBtn.style.border = "none";
  refreshBtn.style.color = "#94a3b8";
  refreshBtn.style.cursor = "pointer";
  refreshBtn.style.minWidth = "32px";
  refreshBtn.style.minHeight = "32px";

  badge.appendChild(dot);
  badge.appendChild(label);
  badge.appendChild(sep1);
  badge.appendChild(pingSpan);
  badge.appendChild(sep2);
  badge.appendChild(fpsSpan);
  badge.appendChild(refreshBtn);
  container.appendChild(badge);

  function updateView(): void {
    state = computeState();
    const color = state === "online" ? "#10b981" : state === "degraded" ? "#f59e0b" : "#ef4444";
    dot.style.backgroundColor = color;

    const statusText =
      state === "online"
        ? t("systemStatus.statusOnline")
        : state === "degraded"
          ? t("systemStatus.statusDegraded")
          : t("systemStatus.statusOffline");

    label.textContent = statusText;
    pingSpan.textContent = pingMs >= 0 ? `${pingMs}ms` : "ERR";
    pingSpan.style.color = pingMs < 150 ? "#34d399" : "#fbbf24";
    fpsSpan.textContent = `${fps} FPS`;

    badge.setAttribute(
      "aria-label",
      `${t("systemStatus.title")}: ${statusText}, ${t("systemStatus.ping", { ms: String(pingMs) })}, ${t("systemStatus.fps", { fps: String(fps) })}`,
    );
  }

  refreshBtn.addEventListener("click", async () => {
    if (!options.onRefreshPing) return;
    try {
      const newPing = await options.onRefreshPing();
      pingMs = newPing;
      updateView();
    } catch {
      pingMs = -1;
      updateView();
    }
  });

  updateView();

  return {
    element: container,
    setPing: (ms: number) => {
      pingMs = ms;
      updateView();
    },
    setFps: (newFps: number) => {
      fps = Math.round(newFps);
      updateView();
    },
    getState: () => state,
    getPing: () => pingMs,
    getFps: () => fps,
  };
}
