import { describe, it, expect, beforeEach } from "vitest";
import { t, setLocale, getLocale, onLocaleChange } from "./index.js";

describe("i18n system", () => {
  beforeEach(() => {
    setLocale("vi");
  });

  it("defaults to Vietnamese locale", () => {
    expect(getLocale()).toBe("vi");
    expect(t("app.title")).toBe("Tinh Hoa");
    expect(t("elements.fire")).toBe("Hỏa");
  });

  it("translates accurately when switching to English", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(t("app.title")).toBe("Tinh Hoa");
    expect(t("elements.fire")).toBe("Fire");
  });

  it("supports parameter replacement", () => {
    expect(t("a11y.selectElement", { name: "Hỏa" })).toBe("Chọn nguyên tố Hỏa");
  });

  it("falls back to key if translation is missing", () => {
    expect(t("non.existent.key")).toBe("non.existent.key");
  });

  it("triggers listener on locale switch", () => {
    let triggered = false;
    const unsubscribe = onLocaleChange((locale) => {
      if (locale === "en") triggered = true;
    });

    setLocale("en");
    expect(triggered).toBe(true);
    unsubscribe();
  });
});
