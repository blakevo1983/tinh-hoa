import { isGenerativeRelation, isOvercomingRelation } from "./elements.js";
export const BUILDING_KINDS = ["harvester", "storage", "harmony_pool", "crafting_furnace"];
export const BUILDING_DEFINITIONS = {
    harvester: {
        kind: "harvester",
        nameVi: "Trạm Thu Thập",
        nameEn: "Harvester",
        descriptionVi: "Khai thác tài nguyên từ ô địa hình. Sản lượng tăng khi có ô lân cận tương sinh.",
        baseBuildTimeSec: 10,
        baseCost: 30,
    },
    storage: {
        kind: "storage",
        nameVi: "Kho Chứa",
        nameEn: "Storage",
        descriptionVi: "Tăng trần dung lượng tích trữ tối đa của tất cả các tài nguyên trên hành tinh.",
        baseBuildTimeSec: 15,
        baseCost: 40,
    },
    harmony_pool: {
        kind: "harmony_pool",
        nameVi: "Hồ Giao Hòa",
        nameEn: "Harmony Pool",
        descriptionVi: "Nơi giao hòa linh khí và nguyên tố giữa các sinh vật để thực hiện nghi thức lai tạo giống mới.",
        baseBuildTimeSec: 30,
        baseCost: 60,
    },
    crafting_furnace: {
        kind: "crafting_furnace",
        nameVi: "Lò Chế Tác",
        nameEn: "Crafting Furnace",
        descriptionVi: "Nung kết và hòa trộn các nguyên liệu thô để chế tác thành hợp chất và vật phẩm cao cấp.",
        baseBuildTimeSec: 25,
        baseCost: 50,
    },
};
/**
 * Calculates building construction or upgrade cost based on level.
 */
export function getBuildingCost(kind, level, primaryElement) {
    const def = BUILDING_DEFINITIONS[kind];
    // Cost scales linearly: baseCost * level
    const amount = Math.floor(def.baseCost * Math.max(1, level));
    return {
        resourceKey: primaryElement,
        amount,
    };
}
/**
 * Calculates build/upgrade duration in seconds.
 */
export function getBuildingTimeSec(kind, level) {
    const def = BUILDING_DEFINITIONS[kind];
    // Duration scales: baseBuildTime * level
    return Math.floor(def.baseBuildTimeSec * Math.max(1, level));
}
/**
 * Calculates capacity bonus provided by storage building.
 * Level 1: +500 cap, Level 2: +1000 cap, etc.
 */
export function getStorageCapBonus(level) {
    return level * 500;
}
/**
 * Calculates tile production rate per second based on richness, building level,
 * and cardinal neighbor affinity (GDD 3.3).
 *
 * Base rate = 0.2 * richness * level
 * Neighbor modifiers:
 * - Generative neighbor (neighbor generates this tile's element): +20% (+0.2)
 * - Overcoming neighbor (neighbor overcomes this tile's element): -33% (-0.33)
 * - Overcome neighbor (this tile's element overcomes neighbor): +15% (+0.15)
 */
export function calculateHarvesterProductionRate(tileElement, richness, level, neighborElements) {
    const baseRate = 0.2 * Math.max(1, richness) * Math.max(1, level);
    let modifier = 1.0;
    for (const neighbor of neighborElements) {
        // Generative: Neighbor generates tileElement -> +20%
        if (isGenerativeRelation(neighbor, tileElement)) {
            modifier += 0.2;
        }
        // Overcoming: Neighbor overcomes tileElement -> -33%
        if (isOvercomingRelation(neighbor, tileElement)) {
            modifier -= 0.33;
        }
        // Overcome: tileElement overcomes neighbor -> +15%
        if (isOvercomingRelation(tileElement, neighbor)) {
            modifier += 0.15;
        }
    }
    // Minimum multiplier floor 0.2 to avoid complete zero/negative production
    modifier = Math.max(0.2, modifier);
    return Math.round(baseRate * modifier * 1000) / 1000;
}
//# sourceMappingURL=buildings.js.map