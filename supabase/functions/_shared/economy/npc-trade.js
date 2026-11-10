import { getElementRelation } from "../breeding/breed.js";
/**
 * Pure function to calculate NPC exchange rate with mathematical anti-arbitrage guarantee.
 * Conforms to GDD 10, Roadmap P5 and Security review specs.
 */
export function calculateNpcExchangeRate(fromElement, toElement, personality, npcElement) {
    if (fromElement === toElement) {
        return {
            effectiveRate: 1.0,
            baseSpread: 1.0,
            elementalAffinityMultiplier: 1.0,
            descriptionVi: "Nguyên tố giống nhau, không phát sinh tỷ giá trao đổi.",
        };
    }
    // Mercantile NPCs take slightly lower trade commission (12% instead of 15%)
    const baseSpread = personality === "mercantile" ? 0.88 : 0.85;
    let affinityMultiplier = 1.0;
    let desc = "Tỷ giá trao đổi tiêu chuẩn có trừ phí sàn 15%.";
    if (fromElement === npcElement) {
        // Offering the NPC their own abundant element -> Lower valuation
        affinityMultiplier = 0.9;
        desc = "Hành tinh đối tác dư thừa nguyên tố bản địa này, định giá thu mua giảm 10%.";
    }
    else if (getElementRelation(fromElement, npcElement) === "generative") {
        // Offering an element that nourishes the NPC's element -> Higher valuation
        affinityMultiplier = 1.1;
        desc =
            "Nguyên tố cống nạp có tính tương sinh nuôi dưỡng, hành tinh đối tác thưởng 10% giá trị.";
    }
    const effectiveRate = Number((baseSpread * affinityMultiplier).toFixed(4));
    return {
        effectiveRate,
        baseSpread,
        elementalAffinityMultiplier: affinityMultiplier,
        descriptionVi: desc,
    };
}
/**
 * Calculates received resource units from an NPC exchange
 */
export function calculateNpcTradeOutput(offerAmount, fromElement, toElement, personality, npcElement) {
    if (offerAmount <= 0)
        return 0;
    const { effectiveRate } = calculateNpcExchangeRate(fromElement, toElement, personality, npcElement);
    return Math.floor(offerAmount * effectiveRate);
}
//# sourceMappingURL=npc-trade.js.map