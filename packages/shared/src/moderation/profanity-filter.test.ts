import { describe, it, expect } from "vitest";
import { filterProfanity, normalizeVietnameseText } from "./profanity-filter.js";

describe("Profanity Filter (T3.3)", () => {
  it("normalizes Vietnamese text and leetspeak correctly", () => {
    expect(normalizeVietnameseText("Đất Trời Tinh Hoa")).toBe("dat troi tinh hoa");
    expect(normalizeVietnameseText("H1 l0v3 y0u")).toBe("hi love you");
    expect(normalizeVietnameseText("Địt mẹ")).toBe("dit me");
  });

  it("passes clean and friendly messages unmodified", () => {
    const cleanTexts = [
      "Chào mừng bạn đến với hành tinh Tinh Hoa!",
      "Hành tinh của tôi chuyên về hệ Thủy và Kim.",
      "Bạn có muốn trao đổi quặng sắt thô không?",
      "Con Thiết Giáp Thú này mạnh quá!",
      "Hồ Giao Hòa đã ấp xong trứng rồi.",
    ];

    for (const text of cleanTexts) {
      const res = filterProfanity(text);
      expect(res.hasProfanity).toBe(false);
      expect(res.filteredText).toBe(text);
    }
  });

  it("detects and masks common Vietnamese profane words", () => {
    const profaneCases = [
      { input: "Thằng này dmm mày", expectedProfane: true },
      { input: "Địt mẹ thằng kia", expectedProfane: true },
      { input: "Game như vcl thế này", expectedProfane: true },
      { input: "Đồ đéo biết chơi", expectedProfane: true },
      { input: "Mày là đồ óc chó", expectedProfane: true },
    ];

    for (const { input, expectedProfane } of profaneCases) {
      const res = filterProfanity(input);
      expect(res.hasProfanity).toBe(expectedProfane);
      expect(res.filteredText).not.toBe(input);
      expect(res.filteredText).toContain("*");
    }
  });

  it("detects leetspeak evasions with punctuation", () => {
    const evasions = ["d.m", "v.k.l", "d-m-m", "l.0.n"];
    for (const word of evasions) {
      const res = filterProfanity(`Ê ${word} mày`);
      expect(res.hasProfanity).toBe(true);
      expect(res.filteredText).toContain("*");
    }
  });
});
