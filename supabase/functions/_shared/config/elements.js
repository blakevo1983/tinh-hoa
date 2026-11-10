export const ELEMENT_KEYS = [
    "metal",
    "wood",
    "water",
    "fire",
    "earth",
    "light",
    "dark",
    "thunder",
];
export const STAT_KEYS = ["qi", "guard", "agility", "harmony", "chaos"];
export const ELEMENT_DEFINITIONS = {
    metal: {
        key: "metal",
        nameVi: "Kim",
        nameEn: "Metal",
        pastelColor: "#C9CED6",
        symbol: "◆",
        descriptionVi: "Bền, chắc, chậm thích nghi",
        baseStats: { qi: 3, guard: 5, agility: 2, harmony: 3, chaos: 1 },
    },
    wood: {
        key: "wood",
        nameVi: "Mộc",
        nameEn: "Wood",
        pastelColor: "#8FD694",
        symbol: "❦",
        descriptionVi: "Sinh trưởng, cộng sinh tốt",
        baseStats: { qi: 3, guard: 3, agility: 3, harmony: 4, chaos: 2 },
    },
    water: {
        key: "water",
        nameVi: "Thủy",
        nameEn: "Water",
        pastelColor: "#7EC8F0",
        symbol: "◖",
        descriptionVi: "Linh hoạt, hợp tác",
        baseStats: { qi: 3, guard: 3, agility: 4, harmony: 4, chaos: 2 },
    },
    fire: {
        key: "fire",
        nameVi: "Hỏa",
        nameEn: "Fire",
        pastelColor: "#F4A261",
        symbol: "▲",
        descriptionVi: "Mạnh nhưng bất ổn",
        baseStats: { qi: 5, guard: 2, agility: 4, harmony: 2, chaos: 5 },
    },
    earth: {
        key: "earth",
        nameVi: "Thổ",
        nameEn: "Earth",
        pastelColor: "#D4B483",
        symbol: "■",
        descriptionVi: "Chậm, rất bền, ổn định",
        baseStats: { qi: 3, guard: 5, agility: 1, harmony: 4, chaos: 1 },
    },
    light: {
        key: "light",
        nameVi: "Quang",
        nameEn: "Light",
        pastelColor: "#FFF3C4",
        symbol: "✦",
        descriptionVi: "Hòa hợp cao, hợp tác",
        baseStats: { qi: 4, guard: 3, agility: 3, harmony: 5, chaos: 2 },
    },
    dark: {
        key: "dark",
        nameVi: "Ám",
        nameEn: "Dark",
        pastelColor: "#8E7CC3",
        symbol: "●",
        descriptionVi: "Tấn công mạnh, khó kết giao",
        baseStats: { qi: 5, guard: 3, agility: 3, harmony: 1, chaos: 4 },
    },
    thunder: {
        key: "thunder",
        nameVi: "Lôi",
        nameEn: "Thunder",
        pastelColor: "#E9D84A",
        symbol: "ϟ",
        descriptionVi: "Nhanh, phá luật, rất bất ổn",
        baseStats: { qi: 4, guard: 1, agility: 5, harmony: 2, chaos: 5 },
    },
};
/**
 * Generation relations: Key generates Value (A sinh B)
 * Mộc -> Hỏa -> Thổ -> Kim -> Thủy -> Mộc
 * Quang -> Mộc, Ám -> Thủy, Lôi -> Hỏa
 */
export const GENERATION_RELATIONS = [
    ["wood", "fire"],
    ["fire", "earth"],
    ["earth", "metal"],
    ["metal", "water"],
    ["water", "wood"],
    ["light", "wood"],
    ["dark", "water"],
    ["thunder", "fire"],
];
/**
 * Overcoming relations: Key overcomes Value (A khắc B)
 * Mộc -> Thổ -> Thủy -> Hỏa -> Kim -> Mộc
 * Quang <-> Ám khắc lẫn nhau
 * Lôi -> Thủy, Lôi -> Kim, Thổ -> Lôi
 */
export const OVERCOMING_RELATIONS = [
    ["wood", "earth"],
    ["earth", "water"],
    ["water", "fire"],
    ["fire", "metal"],
    ["metal", "wood"],
    ["light", "dark"],
    ["dark", "light"],
    ["thunder", "water"],
    ["thunder", "metal"],
    ["earth", "thunder"],
];
export const COMBAT_MULTIPLIERS = {
    overcomes: 1.5,
    isOvercome: 0.67,
    neutral: 1.0,
};
export function isGenerativeRelation(source, target) {
    return GENERATION_RELATIONS.some(([a, b]) => a === source && b === target);
}
export function isOvercomingRelation(attacker, defender) {
    return OVERCOMING_RELATIONS.some(([a, b]) => a === attacker && b === defender);
}
export function getAffinityMultiplier(attacker, defender) {
    if (isOvercomingRelation(attacker, defender)) {
        return COMBAT_MULTIPLIERS.overcomes;
    }
    if (isOvercomingRelation(defender, attacker)) {
        return COMBAT_MULTIPLIERS.isOvercome;
    }
    return COMBAT_MULTIPLIERS.neutral;
}
//# sourceMappingURL=elements.js.map