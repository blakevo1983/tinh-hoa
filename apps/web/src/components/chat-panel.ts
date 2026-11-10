import type { ChatMessage } from "@tinh-hoa/shared";
import type { ChatTransport } from "../lib/chat-transport.js";
import { t } from "../i18n/index.js";

export interface ChatPanelOptions {
  currentUserId: string;
  planetId?: string;
  transport: ChatTransport;
  onReportMessage?: (message: ChatMessage, reason: string) => Promise<void>;
}

export function createChatPanel(options: ChatPanelOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "card chat-panel";
  container.style.marginTop = "16px";
  container.style.padding = "16px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.color = "#f8fafc";
  container.style.display = "flex";
  container.style.flexDirection = "column";

  // Header
  const header = document.createElement("div");
  header.style.marginBottom = "12px";

  const title = document.createElement("h3");
  title.style.margin = "0 0 4px 0";
  title.style.fontSize = "1.1rem";
  title.style.color = "#38bdf8";
  title.textContent = t("chat.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("chat.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Channel Tabs
  let activeChannelId = "global";
  const channelTabs = document.createElement("div");
  channelTabs.style.display = "flex";
  channelTabs.style.gap = "8px";
  channelTabs.style.marginBottom = "12px";

  const btnGlobal = document.createElement("button");
  btnGlobal.type = "button";
  btnGlobal.className = "chat-tab-btn is-active";
  btnGlobal.style.minHeight = "44px";
  btnGlobal.style.padding = "8px 16px";
  btnGlobal.style.borderRadius = "8px";
  btnGlobal.style.border = "1px solid #475569";
  btnGlobal.style.backgroundColor = "#38bdf8";
  btnGlobal.style.color = "#0f172a";
  btnGlobal.style.fontWeight = "600";
  btnGlobal.style.cursor = "pointer";
  btnGlobal.textContent = t("chat.channelGlobal");

  const planetChannelId = options.planetId ? `planet:${options.planetId}` : "planet";
  const btnPlanet = document.createElement("button");
  btnPlanet.type = "button";
  btnPlanet.className = "chat-tab-btn";
  btnPlanet.style.minHeight = "44px";
  btnPlanet.style.padding = "8px 16px";
  btnPlanet.style.borderRadius = "8px";
  btnPlanet.style.border = "1px solid #475569";
  btnPlanet.style.backgroundColor = "#1e293b";
  btnPlanet.style.color = "#f8fafc";
  btnPlanet.style.fontWeight = "600";
  btnPlanet.style.cursor = "pointer";
  btnPlanet.textContent = t("chat.channelPlanet");

  channelTabs.appendChild(btnGlobal);
  channelTabs.appendChild(btnPlanet);
  container.appendChild(channelTabs);

  // Messages Box
  const messagesBox = document.createElement("div");
  messagesBox.className = "chat-messages-box";
  messagesBox.style.height = "260px";
  messagesBox.style.overflowY = "auto";
  messagesBox.style.padding = "10px";
  messagesBox.style.borderRadius = "8px";
  messagesBox.style.backgroundColor = "#0f172a";
  messagesBox.style.border = "1px solid #334155";
  messagesBox.style.display = "flex";
  messagesBox.style.flexDirection = "column";
  messagesBox.style.gap = "8px";
  messagesBox.style.marginBottom = "12px";
  container.appendChild(messagesBox);

  // Status/Error notification bar
  const statusBar = document.createElement("div");
  statusBar.style.display = "none";
  statusBar.style.padding = "8px 12px";
  statusBar.style.borderRadius = "6px";
  statusBar.style.fontSize = "0.85rem";
  statusBar.style.marginBottom = "10px";
  container.appendChild(statusBar);

  // Input Row
  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "8px";
  inputRow.style.alignItems = "center";

  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.className = "chat-input";
  chatInput.maxLength = 300;
  chatInput.placeholder = t("chat.sendPlaceholder");
  chatInput.setAttribute("aria-label", t("chat.sendPlaceholder"));
  chatInput.style.flex = "1";
  chatInput.style.minHeight = "44px";
  chatInput.style.padding = "8px 12px";
  chatInput.style.borderRadius = "8px";
  chatInput.style.backgroundColor = "#1e293b";
  chatInput.style.border = "1px solid #475569";
  chatInput.style.color = "#f8fafc";
  chatInput.style.fontSize = "0.9rem";

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "chat-send-btn";
  sendBtn.setAttribute("aria-label", t("chat.btnSend"));
  sendBtn.textContent = t("chat.btnSend");
  sendBtn.style.minHeight = "44px";
  sendBtn.style.padding = "8px 18px";
  sendBtn.style.borderRadius = "8px";
  sendBtn.style.border = "none";
  sendBtn.style.backgroundColor = "#0284c7";
  sendBtn.style.color = "#ffffff";
  sendBtn.style.fontWeight = "600";
  sendBtn.style.cursor = "pointer";

  inputRow.appendChild(chatInput);
  inputRow.appendChild(sendBtn);
  container.appendChild(inputRow);

  const charCounter = document.createElement("div");
  charCounter.style.fontSize = "0.75rem";
  charCounter.style.color = "#64748b";
  charCounter.style.textAlign = "right";
  charCounter.style.marginTop = "4px";
  charCounter.textContent = "0/300";
  container.appendChild(charCounter);

  chatInput.addEventListener("input", () => {
    charCounter.textContent = `${chatInput.value.length}/300`;
  });

  // State
  let messages: ChatMessage[] = [];
  let unsubscribeRealtime: (() => void) | null = null;
  let cooldownEnd = 0;

  function showStatus(text: string, isError = false): void {
    statusBar.style.display = "block";
    statusBar.style.backgroundColor = isError
      ? "rgba(248, 113, 113, 0.15)"
      : "rgba(74, 222, 128, 0.15)";
    statusBar.style.border = isError ? "1px solid #f87171" : "1px solid #4ade80";
    statusBar.style.color = isError ? "#f87171" : "#4ade80";
    statusBar.textContent = text;
  }

  function renderMessages(): void {
    while (messagesBox.firstChild) {
      messagesBox.removeChild(messagesBox.firstChild);
    }

    if (messages.length === 0) {
      const emptyNote = document.createElement("div");
      emptyNote.style.color = "#64748b";
      emptyNote.style.fontSize = "0.85rem";
      emptyNote.style.fontStyle = "italic";
      emptyNote.style.textAlign = "center";
      emptyNote.style.marginTop = "60px";
      emptyNote.textContent = t("chat.noMessages");
      messagesBox.appendChild(emptyNote);
      return;
    }

    for (const msg of messages) {
      const row = document.createElement("div");
      row.className = "chat-message-row";
      row.style.display = "flex";
      row.style.flexDirection = "column";
      row.style.padding = "6px 8px";
      row.style.borderRadius = "6px";
      row.style.backgroundColor =
        msg.senderId === options.currentUserId ? "rgba(56, 189, 248, 0.08)" : "transparent";

      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.justifyContent = "space-between";
      meta.style.fontSize = "0.75rem";
      meta.style.color = "#94a3b8";
      meta.style.marginBottom = "2px";

      const senderSpan = document.createElement("span");
      senderSpan.style.fontWeight = "600";
      senderSpan.style.color = msg.senderId === options.currentUserId ? "#38bdf8" : "#cbd5e1";
      senderSpan.textContent = msg.senderName || "Voyager";

      const timeSpan = document.createElement("span");
      timeSpan.textContent = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      meta.appendChild(senderSpan);
      meta.appendChild(timeSpan);

      const contentDiv = document.createElement("div");
      contentDiv.style.fontSize = "0.85rem";
      contentDiv.style.color = "#f8fafc";
      contentDiv.style.wordBreak = "break-word";
      contentDiv.textContent = msg.filteredContent || msg.content;

      row.appendChild(meta);
      row.appendChild(contentDiv);
      messagesBox.appendChild(row);
    }

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function switchChannel(channelId: string): Promise<void> {
    activeChannelId = channelId;
    btnGlobal.style.backgroundColor = channelId === "global" ? "#38bdf8" : "#1e293b";
    btnGlobal.style.color = channelId === "global" ? "#0f172a" : "#f8fafc";
    btnPlanet.style.backgroundColor = channelId !== "global" ? "#38bdf8" : "#1e293b";
    btnPlanet.style.color = channelId !== "global" ? "#0f172a" : "#f8fafc";

    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }

    try {
      messages = await options.transport.getHistory(activeChannelId);
      renderMessages();
    } catch {
      messages = [];
      renderMessages();
    }

    unsubscribeRealtime = options.transport.subscribe(activeChannelId, (newMsg) => {
      messages.push(newMsg);
      renderMessages();
    });
  }

  btnGlobal.addEventListener("click", () => switchChannel("global"));
  btnPlanet.addEventListener("click", () => switchChannel(planetChannelId));

  async function handleSend(): Promise<void> {
    const text = chatInput.value.trim();
    if (!text || sendBtn.disabled) return;

    if (activeChannelId === "global" && Date.now() < cooldownEnd) {
      const waitSec = Math.ceil((cooldownEnd - Date.now()) / 1000);
      showStatus(t("chat.cooldownActive").replace("{sec}", String(waitSec)), true);
      return;
    }

    sendBtn.disabled = true;
    chatInput.disabled = true;
    statusBar.style.display = "none";

    const clientMsgId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const sentMsg = await options.transport.send(activeChannelId, text, clientMsgId);
      if (!messages.some((m) => m.id === sentMsg.id)) {
        messages.push(sentMsg);
        renderMessages();
      }
      chatInput.value = "";
      charCounter.textContent = "0/300";

      if (activeChannelId === "global") {
        cooldownEnd = Date.now() + 10000;
      }
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "SEND_FAILED";
      showStatus(`Lỗi gửi tin: ${code}`, true);
    } finally {
      sendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  sendBtn.addEventListener("click", handleSend);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Initial load
  switchChannel("global");

  return container;
}
