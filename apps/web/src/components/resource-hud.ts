import { ELEMENT_DEFINITIONS, type ElementKey } from "@tinh-hoa/shared";

export interface ResourceBalanceDisplay {
  resourceKey: ElementKey;
  amount: number;
  ratePerSec: number;
  cap: number;
}

export interface ResourceHudOptions {
  balances: ResourceBalanceDisplay[];
  onSyncRequest?: () => void;
}

export function createResourceHud(options: ResourceHudOptions): {
  element: HTMLElement;
  updateBalances: (newBalances: ResourceBalanceDisplay[]) => void;
} {
  const container = document.createElement("section");
  container.className = "resource-hud card";
  container.setAttribute("aria-label", "Bảng tài nguyên hành tinh");
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.gap = "10px";
  container.style.padding = "12px 16px";
  container.style.backgroundColor = "var(--color-surface, #1e293b)";
  container.style.border = "1px solid var(--color-border, #334155)";
  container.style.borderRadius = "12px";
  container.style.marginBottom = "16px";

  const balanceMap = new Map<
    ElementKey,
    {
      amountSpan: HTMLSpanElement;
      rateSpan: HTMLSpanElement;
      currentDisplayAmount: number;
    }
  >();

  options.balances.forEach((bal) => {
    const elemDef = ELEMENT_DEFINITIONS[bal.resourceKey];
    const badge = document.createElement("div");
    badge.className = "resource-badge";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.gap = "6px";
    badge.style.padding = "6px 12px";
    badge.style.borderRadius = "8px";
    badge.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
    badge.style.border = `1px solid ${elemDef.pastelColor}44`;
    badge.style.minHeight = "44px"; // Rule 25 touch target
    badge.style.boxSizing = "border-box";

    const symbolSpan = document.createElement("span");
    symbolSpan.style.color = elemDef.pastelColor;
    symbolSpan.style.fontWeight = "bold";
    symbolSpan.textContent = elemDef.symbol;

    const nameSpan = document.createElement("span");
    nameSpan.style.fontSize = "0.85rem";
    nameSpan.style.color = "#94a3b8";
    nameSpan.textContent = elemDef.nameVi;

    const amountSpan = document.createElement("span");
    amountSpan.style.fontWeight = "600";
    amountSpan.style.fontSize = "0.95rem";
    amountSpan.style.color = "#f8fafc";
    amountSpan.textContent = Math.floor(bal.amount).toString();

    const rateSpan = document.createElement("span");
    rateSpan.style.fontSize = "0.75rem";
    rateSpan.style.color = "#38bdf8";
    rateSpan.textContent = `+${bal.ratePerSec}/s`;

    badge.appendChild(symbolSpan);
    badge.appendChild(nameSpan);
    badge.appendChild(amountSpan);
    badge.appendChild(rateSpan);
    container.appendChild(badge);

    balanceMap.set(bal.resourceKey, {
      amountSpan,
      rateSpan,
      currentDisplayAmount: bal.amount,
    });
  });

  const updateBalances = (newBalances: ResourceBalanceDisplay[]) => {
    newBalances.forEach((bal) => {
      const entry = balanceMap.get(bal.resourceKey);
      if (entry) {
        entry.currentDisplayAmount = bal.amount;
        entry.amountSpan.textContent = Math.floor(bal.amount).toString();
        entry.rateSpan.textContent = `+${bal.ratePerSec}/s`;
      }
    });
  };

  return { element: container, updateBalances };
}
