import type { ElementKey } from "./elements.js";
import type { Stats } from "../schemas/element.js";

export type ItemCategory = "raw" | "compound" | "legendary";

export interface ItemDefinition {
  readonly key: string;
  readonly nameVi: string;
  readonly nameEn: string;
  readonly category: ItemCategory;
  readonly element: ElementKey;
  readonly secondaryElement?: ElementKey;
  readonly rarity: 1 | 2 | 3 | 4 | 5;
  readonly baseStats?: Stats;
  readonly descriptionVi: string;
}

export const BASE_ITEMS: readonly ItemDefinition[] = [
  // 1-5: Basic Raw Elements (Rarity 1)
  {
    key: "iron_ore",
    nameVi: "Quặng Sắt Thô",
    nameEn: "Iron Ore",
    category: "raw",
    element: "metal",
    rarity: 1,
    descriptionVi: "Khối quặng thô khai thác từ các vách đá kim loại kiên cố.",
  },
  {
    key: "ancient_wood",
    nameVi: "Gỗ Cổ Thụ",
    nameEn: "Ancient Wood",
    category: "raw",
    element: "wood",
    rarity: 1,
    descriptionVi: "Thớ gỗ già dặn mang mùi hương thảo mộc và nhựa sống dồi dào.",
  },
  {
    key: "pure_water",
    nameVi: "Nước Tinh Khiết",
    nameEn: "Pure Water",
    category: "raw",
    element: "water",
    rarity: 1,
    descriptionVi: "Nguồn nước trong vắt lắng đọng từ các dòng suối nguyên sinh.",
  },
  {
    key: "flame_coal",
    nameVi: "Than Lửa",
    nameEn: "Flame Coal",
    category: "raw",
    element: "fire",
    rarity: 1,
    descriptionVi: "Tảng than ấm nóng âm ỉ giữ nhiệt lâu ngày dưới lòng đất.",
  },
  {
    key: "fertile_clay",
    nameVi: "Đất Sét Màu Mỡ",
    nameEn: "Fertile Clay",
    category: "raw",
    element: "earth",
    rarity: 1,
    descriptionVi: "Đất sét dẻo mịn chứa nhiều khoáng chất bồi đắp địa tầng.",
  },

  // 6-8: Special Raw Elements (Rarity 2)
  {
    key: "light_sand",
    nameVi: "Cát Phát Quang",
    nameEn: "Luminescent Sand",
    category: "raw",
    element: "light",
    rarity: 2,
    descriptionVi: "Hạt cát lấp lánh phản chiếu ánh hào quang dịu nhẹ trong bóng tối.",
  },
  {
    key: "obsidian_shard",
    nameVi: "Mảnh Hắc Diện Thạch",
    nameEn: "Obsidian Shard",
    category: "raw",
    element: "dark",
    rarity: 2,
    descriptionVi: "Mảnh đá đen tuyền có cạnh sắc bén, hấp thu toàn bộ ánh sáng.",
  },
  {
    key: "thunder_stone",
    nameVi: "Đá Tích Điện",
    nameEn: "Thunder Stone",
    category: "raw",
    element: "thunder",
    rarity: 2,
    descriptionVi: "Khoáng thạch tĩnh điện phát ra tia lửa li ti khi va chạm nhẹ.",
  },

  // 9-13: Compound / Crafted Materials (Rarity 3)
  {
    key: "alloy_ingot",
    nameVi: "Thỏi Hợp Kim",
    nameEn: "Alloy Ingot",
    category: "compound",
    element: "metal",
    secondaryElement: "fire",
    rarity: 3,
    baseStats: { qi: 25, guard: 40, agility: 15, harmony: 20, chaos: 10 },
    descriptionVi: "Sắt nung chảy hòa quyện lửa thiêng tạo nên thỏi kim loại rắn chắc.",
  },
  {
    key: "dew_essence",
    nameVi: "Tinh Chất Sương Mai",
    nameEn: "Dew Essence",
    category: "compound",
    element: "water",
    secondaryElement: "wood",
    rarity: 3,
    baseStats: { qi: 35, guard: 15, agility: 25, harmony: 45, chaos: 5 },
    descriptionVi: "Giọt sương chưng cất từ đại thụ buổi sớm, thanh lọc tạp chất.",
  },
  {
    key: "terracotta_brick",
    nameVi: "Gạch Nung Cổ",
    nameEn: "Terracotta Brick",
    category: "compound",
    element: "earth",
    secondaryElement: "fire",
    rarity: 3,
    baseStats: { qi: 20, guard: 35, agility: 10, harmony: 25, chaos: 12 },
    descriptionVi: "Khối gạch đất sét nung chín qua lửa đỏ, bền vững trước thời gian.",
  },
  {
    key: "rooted_amber",
    nameVi: "Hổ Phách Cắm Rễ",
    nameEn: "Rooted Amber",
    category: "compound",
    element: "wood",
    secondaryElement: "earth",
    rarity: 3,
    baseStats: { qi: 30, guard: 30, agility: 18, harmony: 35, chaos: 8 },
    descriptionVi: "Nhựa cây vùi sâu dưới tầng đất tạo thành viên ngọc vàng óng.",
  },
  {
    key: "steam_crystal",
    nameVi: "Tinh Thể Hơi Nước",
    nameEn: "Steam Crystal",
    category: "compound",
    element: "water",
    secondaryElement: "fire",
    rarity: 3,
    baseStats: { qi: 40, guard: 12, agility: 30, harmony: 20, chaos: 30 },
    descriptionVi: "Tinh thể kết tinh từ hơi nóng giao hòa mặt nước, biến ảo bất định.",
  },

  // 14-15: Legendary / Catalysts (Rarity 5)
  {
    key: "celestial_dew",
    nameVi: "Cam Lộ Thiên Giới",
    nameEn: "Celestial Dew",
    category: "legendary",
    element: "light",
    secondaryElement: "water",
    rarity: 5,
    baseStats: { qi: 60, guard: 30, agility: 40, harmony: 70, chaos: 5 },
    descriptionVi: "Chất lỏng thần thoại tỏa sáng rạng ngời, xúc tác hài hòa bậc cao nhất.",
  },
  {
    key: "void_ash",
    nameVi: "Tro Tàn Hư Vô",
    nameEn: "Void Ash",
    category: "legendary",
    element: "dark",
    secondaryElement: "fire",
    rarity: 5,
    baseStats: { qi: 65, guard: 25, agility: 35, harmony: 10, chaos: 60 },
    descriptionVi: "Tàn tro của sao băng rơi rụng, kích thích đột biến và năng lượng hỗn loạn.",
  },
] as const;

export const ITEMS_BY_KEY: Record<string, ItemDefinition> = Object.fromEntries(
  BASE_ITEMS.map((item) => [item.key, item]),
);
