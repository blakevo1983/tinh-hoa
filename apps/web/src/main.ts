import "./styles/main.css";
import {
  ELEMENT_KEYS,
  ELEMENT_DEFINITIONS,
  type ElementKey,
  type ElementDefinition,
} from "@tinh-hoa/shared";
import { t, getLocale, setLocale, onLocaleChange, type Locale } from "./i18n/index.js";
import { renderPlanet, setupCanvasDpi, type PlanetState } from "./canvas/planet-renderer.js";

interface AppState {
  locale: Locale;
  selectedElement: ElementKey;
  rotation: number;
  pulsePhase: number;
}

const state: AppState = {
  locale: getLocale(),
  selectedElement: "water",
  rotation: 0,
  pulsePhase: 0,
};

export function initApp(rootElement: HTMLElement): () => void {
  // Clear root safely
  while (rootElement.firstChild) {
    rootElement.removeChild(rootElement.firstChild);
  }

  // 1. App Header
  const header = document.createElement("header");
  header.className = "app-header";

  const brand = document.createElement("div");
  brand.className = "brand";

  const title = document.createElement("h1");
  title.className = "brand-title";
  title.textContent = t("app.title");

  const subtitle = document.createElement("p");
  subtitle.className = "brand-subtitle";
  subtitle.textContent = t("app.subtitle");

  brand.appendChild(title);
  brand.appendChild(subtitle);

  // Language Toggle Button (Rule 25: min 44x44px, semantic label)
  const langBtn = document.createElement("button");
  langBtn.className = "lang-toggle-btn";
  langBtn.type = "button";
  langBtn.setAttribute("aria-label", t("a11y.languageToggle"));
  langBtn.textContent = state.locale === "vi" ? "VI | Tiếng Việt" : "EN | English";

  langBtn.addEventListener("click", () => {
    const nextLocale: Locale = state.locale === "vi" ? "en" : "vi";
    state.locale = nextLocale;
    setLocale(nextLocale);
  });

  header.appendChild(brand);
  header.appendChild(langBtn);
  rootElement.appendChild(header);

  // 2. Main Stage
  const mainStage = document.createElement("main");
  mainStage.className = "main-stage";

  // Planet Canvas Viewport
  const viewport = document.createElement("div");
  viewport.className = "planet-viewport";

  const canvas = document.createElement("canvas");
  canvas.className = "planet-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", t("a11y.planetCanvasAlt"));
  viewport.appendChild(canvas);
  mainStage.appendChild(viewport);

  // Element Palette Section
  const paletteSection = document.createElement("section");
  paletteSection.className = "element-palette-section";

  const heading = document.createElement("div");
  heading.className = "section-heading";

  const sectionTitle = document.createElement("h2");
  sectionTitle.className = "section-title";
  sectionTitle.textContent = t("elements.title");

  const sectionSubtitle = document.createElement("p");
  sectionSubtitle.className = "section-subtitle";
  sectionSubtitle.textContent = t("elements.subtitle");

  heading.appendChild(sectionTitle);
  heading.appendChild(sectionSubtitle);
  paletteSection.appendChild(heading);

  // Element Button Grid
  const grid = document.createElement("div");
  grid.className = "element-grid";
  grid.setAttribute("role", "radiogroup");
  grid.setAttribute("aria-label", t("elements.title"));

  const elementButtons = new Map<ElementKey, HTMLButtonElement>();

  ELEMENT_KEYS.forEach((key) => {
    const def = ELEMENT_DEFINITIONS[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `element-btn ${key === state.selectedElement ? "is-active" : ""}`;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", key === state.selectedElement ? "true" : "false");
    btn.style.setProperty("--element-accent", def.pastelColor);
    btn.style.setProperty("--element-glow", `${def.pastelColor}55`);

    const symbolSpan = document.createElement("span");
    symbolSpan.className = "element-symbol";
    symbolSpan.textContent = def.symbol;

    const nameSpan = document.createElement("span");
    nameSpan.className = "element-name";
    nameSpan.textContent = t(`elements.${key}`);

    btn.appendChild(symbolSpan);
    btn.appendChild(nameSpan);

    btn.addEventListener("click", () => {
      state.selectedElement = key;
      updateActiveButton();
      updateInfoCard();
    });

    elementButtons.set(key, btn);
    grid.appendChild(btn);
  });

  paletteSection.appendChild(grid);

  // Active Element Info Card
  const infoCard = document.createElement("div");
  infoCard.className = "element-info-card";

  const infoHeader = document.createElement("div");
  infoHeader.className = "info-header";

  const infoSymbol = document.createElement("span");
  infoSymbol.className = "info-symbol";

  const infoTitle = document.createElement("h3");
  infoTitle.className = "info-title";

  infoHeader.appendChild(infoSymbol);
  infoHeader.appendChild(infoTitle);

  const infoDesc = document.createElement("p");
  infoDesc.className = "info-desc";

  infoCard.appendChild(infoHeader);
  infoCard.appendChild(infoDesc);
  paletteSection.appendChild(infoCard);

  mainStage.appendChild(paletteSection);
  rootElement.appendChild(mainStage);

  function updateActiveButton(): void {
    elementButtons.forEach((btn, key) => {
      const isActive = key === state.selectedElement;
      btn.className = `element-btn ${isActive ? "is-active" : ""}`;
      btn.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  }

  function updateInfoCard(): void {
    const def: ElementDefinition = ELEMENT_DEFINITIONS[state.selectedElement];
    infoCard.style.setProperty("--element-accent", def.pastelColor);
    infoSymbol.textContent = def.symbol;
    infoTitle.textContent = `${t(`elements.${state.selectedElement}`)} (${def.nameEn})`;
    infoDesc.textContent = t(`elements.${state.selectedElement}_desc`);
  }

  updateInfoCard();

  // Handle i18n changes
  const unsubscribeLocale = onLocaleChange((newLocale) => {
    state.locale = newLocale;
    title.textContent = t("app.title");
    subtitle.textContent = t("app.subtitle");
    langBtn.textContent = newLocale === "vi" ? "VI | Tiếng Việt" : "EN | English";
    langBtn.setAttribute("aria-label", t("a11y.languageToggle"));
    canvas.setAttribute("aria-label", t("a11y.planetCanvasAlt"));
    sectionTitle.textContent = t("elements.title");
    sectionSubtitle.textContent = t("elements.subtitle");

    elementButtons.forEach((btn, key) => {
      const nameSpan = btn.querySelector(".element-name");
      if (nameSpan) {
        nameSpan.textContent = t(`elements.${key}`);
      }
    });

    updateInfoCard();
  });

  // Canvas DPI & Render Loop
  let ctx: CanvasRenderingContext2D | null = null;
  let animId: number;
  let isRunning = true;

  function resizeCanvas(): void {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width || 320, 240);
    const height = Math.max(rect.height || 320, 240);
    try {
      ctx = setupCanvasDpi(canvas, width, height);
    } catch {
      // Gracefully handle in testing/headless environments without 2D canvas context
      ctx = null;
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function animate(timestamp: number): void {
    if (!isRunning) return;

    state.rotation = (timestamp * 0.0003) % (Math.PI * 2);
    state.pulsePhase = (timestamp * 0.002) % (Math.PI * 2);

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 320;
    const h = rect.height || 320;

    if (ctx) {
      const planetState: PlanetState = {
        element: state.selectedElement,
        rotation: state.rotation,
        pulsePhase: state.pulsePhase,
      };
      renderPlanet(ctx, w, h, planetState);
    }

    animId = requestAnimationFrame(animate);
  }

  animId = requestAnimationFrame(animate);

  return () => {
    isRunning = false;
    cancelAnimationFrame(animId);
    window.removeEventListener("resize", resizeCanvas);
    unsubscribeLocale();
  };
}

if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    initApp(root);
  }
}
