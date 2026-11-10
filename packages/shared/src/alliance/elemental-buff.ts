import type { ElementKey } from "../config/elements.js";
import { getElementRelation } from "../breeding/breed.js";

export interface AllianceBuffResult {
  readonly uniqueElementsCount: number;
  readonly generativePairsCount: number;
  readonly productionBonusPct: number; // e.g. 15 for +15%
  readonly hasFiveElementsHarmony: boolean; // all 5 core elements present
  readonly descriptionVi: string;
}

const CORE_FIVE_ELEMENTS: readonly ElementKey[] = ["metal", "wood", "water", "fire", "earth"];

/**
 * Pure function to calculate alliance elemental synergy buffs (GDD 05 & T4.5).
 * Rewards alliances having diverse and mutually generative elemental members.
 */
export function calculateAllianceElementalBuff(
  memberElements: readonly ElementKey[],
): AllianceBuffResult {
  if (!memberElements || memberElements.length === 0) {
    return {
      uniqueElementsCount: 0,
      generativePairsCount: 0,
      productionBonusPct: 0,
      hasFiveElementsHarmony: false,
      descriptionVi: "Chưa có thành viên, không có hiệu ứng liên minh.",
    };
  }

  const uniqueSet = new Set<ElementKey>(memberElements);
  const uniqueList = Array.from(uniqueSet);

  let generativePairs = 0;
  for (let i = 0; i < uniqueList.length; i++) {
    for (let j = i + 1; j < uniqueList.length; j++) {
      const a = uniqueList[i]!;
      const b = uniqueList[j]!;
      if (getElementRelation(a, b) === "generative") {
        generativePairs++;
      }
    }
  }

  // Check if all 5 core elements are present
  const hasFiveElementsHarmony = CORE_FIVE_ELEMENTS.every((elem) => uniqueSet.has(elem));

  // Bonus percentage: +3% per generative pair, up to 20% max
  let productionBonusPct = Math.min(generativePairs * 3, 20);
  if (hasFiveElementsHarmony) {
    productionBonusPct = Math.min(productionBonusPct + 10, 30);
  }

  const desc = hasFiveElementsHarmony
    ? `Ngũ Hành Đại Hòa Hợp: Kích hoạt toàn bộ 5 hệ cơ bản (+${productionBonusPct}% sản lượng)!`
    : `Cộng hưởng ${generativePairs} cặp tương sinh (+${productionBonusPct}% sản lượng).`;

  return {
    uniqueElementsCount: uniqueSet.size,
    generativePairsCount: generativePairs,
    productionBonusPct,
    hasFiveElementsHarmony,
    descriptionVi: desc,
  };
}
