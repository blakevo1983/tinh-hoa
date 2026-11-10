import type { ElementKey, NpcPlanet } from "@tinh-hoa/shared";
import { ELEMENT_KEYS, calculateNpcExchangeRate } from "@tinh-hoa/shared";
import { t } from "../i18n/index.js";

export interface TradePanelOptions {
  planetId: string;
  npcPlanets: NpcPlanet[];
  dailyTradedUnits: number;
  dailyCap?: number;
  onTrade?: (
    npcPlanetId: string,
    offerResource: ElementKey,
    offerAmount: number,
    targetResource: ElementKey,
  ) => Promise<void>;
}

export function createTradePanel(options: TradePanelOptions): HTMLElement {
  const dailyCap = options.dailyCap ?? 2000;

  const container = document.createElement("div");
  container.className = "card trade-panel";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("trade.title"));
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
  title.textContent = t("trade.title");

  const subtitle = document.createElement("p");
  subtitle.style.margin = "0";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.color = "#94a3b8";
  subtitle.textContent = t("trade.subtitle");

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Status message
  const statusEl = document.createElement("div");
  statusEl.className = "trade-status";
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

  // Daily Quota indicator
  const quotaBox = document.createElement("div");
  quotaBox.style.padding = "8px 12px";
  quotaBox.style.borderRadius = "6px";
  quotaBox.style.backgroundColor = "#0f172a";
  quotaBox.style.border = "1px solid #334155";
  quotaBox.style.fontSize = "0.85rem";
  quotaBox.style.color = "#94a3b8";
  quotaBox.textContent = t("trade.dailyCap", {
    used: String(options.dailyTradedUnits),
    max: String(dailyCap),
  });
  container.appendChild(quotaBox);

  // Form controls
  const form = document.createElement("form");
  form.className = "trade-form";
  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.gap = "12px";

  // 1. Select NPC partner
  const npcGroup = document.createElement("div");
  npcGroup.style.display = "flex";
  npcGroup.style.flexDirection = "column";
  npcGroup.style.gap = "4px";

  const npcLabel = document.createElement("label");
  npcLabel.style.fontSize = "0.85rem";
  npcLabel.textContent = t("trade.selectNpc");

  const npcSelect = document.createElement("select");
  npcSelect.setAttribute("aria-label", t("trade.selectNpc"));
  npcSelect.style.minHeight = "44px";
  npcSelect.style.padding = "8px 12px";
  npcSelect.style.borderRadius = "8px";
  npcSelect.style.border = "1px solid #475569";
  npcSelect.style.backgroundColor = "#0f172a";
  npcSelect.style.color = "#f8fafc";

  for (const npc of options.npcPlanets) {
    const opt = document.createElement("option");
    opt.value = npc.id;
    opt.textContent = `${npc.name} (${npc.element} - ${npc.personality})`;
    npcSelect.appendChild(opt);
  }
  npcGroup.appendChild(npcLabel);
  npcGroup.appendChild(npcSelect);
  form.appendChild(npcGroup);

  // 2. Offer element & amount
  const tradeRow = document.createElement("div");
  tradeRow.style.display = "flex";
  tradeRow.style.flexWrap = "wrap";
  tradeRow.style.gap = "8px";
  tradeRow.style.alignItems = "center";

  const offerSelect = document.createElement("select");
  offerSelect.setAttribute("aria-label", t("trade.offerLabel"));
  offerSelect.style.minHeight = "44px";
  offerSelect.style.padding = "8px 10px";
  offerSelect.style.borderRadius = "8px";
  offerSelect.style.border = "1px solid #475569";
  offerSelect.style.backgroundColor = "#0f172a";
  offerSelect.style.color = "#f8fafc";

  const targetSelect = document.createElement("select");
  targetSelect.setAttribute("aria-label", t("trade.targetLabel"));
  targetSelect.style.minHeight = "44px";
  targetSelect.style.padding = "8px 10px";
  targetSelect.style.borderRadius = "8px";
  targetSelect.style.border = "1px solid #475569";
  targetSelect.style.backgroundColor = "#0f172a";
  targetSelect.style.color = "#f8fafc";

  for (const elem of ELEMENT_KEYS) {
    const optOffer = document.createElement("option");
    optOffer.value = elem;
    optOffer.textContent = elem;
    offerSelect.appendChild(optOffer);

    const optTarget = document.createElement("option");
    optTarget.value = elem;
    optTarget.textContent = elem;
    if (elem === "water") optTarget.selected = true;
    targetSelect.appendChild(optTarget);
  }

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.min = "1";
  amountInput.max = "2000";
  amountInput.placeholder = "Số lượng...";
  amountInput.setAttribute("aria-label", "Offer amount");
  amountInput.style.minHeight = "44px";
  amountInput.style.padding = "8px 12px";
  amountInput.style.borderRadius = "8px";
  amountInput.style.border = "1px solid #475569";
  amountInput.style.backgroundColor = "#0f172a";
  amountInput.style.color = "#f8fafc";
  amountInput.style.width = "110px";

  tradeRow.appendChild(offerSelect);
  tradeRow.appendChild(amountInput);
  tradeRow.appendChild(document.createTextNode("→"));
  tradeRow.appendChild(targetSelect);
  form.appendChild(tradeRow);

  // Rate info box
  const rateBox = document.createElement("div");
  rateBox.style.padding = "10px 12px";
  rateBox.style.borderRadius = "8px";
  rateBox.style.backgroundColor = "#0f172a";
  rateBox.style.border = "1px solid #334155";
  rateBox.style.fontSize = "0.85rem";
  rateBox.style.color = "#60a5fa";

  function updateRatePreview() {
    const selectedNpcId = npcSelect.value;
    const npc = options.npcPlanets.find((n) => n.id === selectedNpcId);
    if (!npc) return;

    const offerElem = offerSelect.value as ElementKey;
    const targetElem = targetSelect.value as ElementKey;

    const rateResult = calculateNpcExchangeRate(
      offerElem,
      targetElem,
      npc.personality,
      npc.element,
    );
    rateBox.textContent = `${t("trade.rateLabel", {
      offer: offerElem,
      rate: String(rateResult.effectiveRate),
      target: targetElem,
    })} (${rateResult.descriptionVi})`;
  }

  npcSelect.onchange = updateRatePreview;
  offerSelect.onchange = updateRatePreview;
  targetSelect.onchange = updateRatePreview;
  updateRatePreview();

  form.appendChild(rateBox);

  // Submit button
  const btnSubmit = document.createElement("button");
  btnSubmit.type = "submit";
  btnSubmit.textContent = t("trade.btnExchange");
  btnSubmit.style.minHeight = "44px";
  btnSubmit.style.padding = "8px 20px";
  btnSubmit.style.borderRadius = "8px";
  btnSubmit.style.border = "none";
  btnSubmit.style.backgroundColor = "#10b981";
  btnSubmit.style.color = "#0f172a";
  btnSubmit.style.fontWeight = "600";
  btnSubmit.style.cursor = "pointer";

  form.onsubmit = async (e) => {
    e.preventDefault();
    const npcId = npcSelect.value;
    const offerElem = offerSelect.value as ElementKey;
    const targetElem = targetSelect.value as ElementKey;
    const amount = parseInt(amountInput.value, 10);

    if (isNaN(amount) || amount <= 0) {
      setStatus("Số lượng trao đổi phải lớn hơn 0.", true);
      return;
    }
    if (offerElem === targetElem) {
      setStatus("Không thể đổi hai nguyên tố giống nhau.", true);
      return;
    }
    if (options.dailyTradedUnits + amount > dailyCap) {
      setStatus("Vượt quá hạn mức giao dịch trong ngày.", true);
      return;
    }

    try {
      btnSubmit.disabled = true;
      await options.onTrade?.(npcId, offerElem, amount, targetElem);
      setStatus("Đã hoàn tất giao dịch với hành tinh đối tác!");
      amountInput.value = "";
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      btnSubmit.disabled = false;
    }
  };

  form.appendChild(btnSubmit);
  container.appendChild(form);

  return container;
}
