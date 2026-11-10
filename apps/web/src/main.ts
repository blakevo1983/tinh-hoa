import "./styles/main.css";
import {
  ELEMENT_KEYS,
  ELEMENT_DEFINITIONS,
  type ElementKey,
  type ElementDefinition,
  type PlanetTile,
} from "@tinh-hoa/shared";
import { t, getLocale, setLocale, onLocaleChange, type Locale } from "./i18n/index.js";
import { renderPlanet, setupCanvasDpi, type PlanetState } from "./canvas/planet-renderer.js";
import { createAuthPanel } from "./components/auth-panel.js";
import {
  createPlanetCreationPanel,
  type CreatedPlanetData,
} from "./components/planet-creation-panel.js";
import { createBreedingPanel, type AvailableCreature } from "./components/breeding-panel.js";
import { createCodexPanel } from "./components/codex-panel.js";
import { createChatPanel } from "./components/chat-panel.js";
import { createStatusIndicator } from "./components/status-indicator.js";
import { SupabaseChatTransport } from "./lib/chat-transport.js";

interface AppState {
  locale: Locale;
  selectedElement: ElementKey;
  rotation: number;
  pulsePhase: number;
  activePlanet: CreatedPlanetData | null;
  viewMode: "sphere" | "grid";
  selectedTile: PlanetTile | null;
}

const state: AppState = {
  locale: getLocale(),
  selectedElement: "water",
  rotation: 0,
  pulsePhase: 0,
  activePlanet: null,
  viewMode: "sphere",
  selectedTile: null,
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

  // Language Toggle Button (Rule 25: min 44x44px)
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

  // System Status & Health Indicator (T7.4, Rule 25)
  const statusIndicator = createStatusIndicator({
    initialPingMs: 38,
    initialFps: 60,
  });
  header.appendChild(statusIndicator.element);

  header.appendChild(langBtn);
  rootElement.appendChild(header);

  // Auth Panel (Sign in / Sign up / Profile)
  const authPanel = createAuthPanel();
  rootElement.appendChild(authPanel);

  // 2. Main Stage
  const mainStage = document.createElement("main");
  mainStage.className = "main-stage";

  // Planet Canvas Viewport
  const viewport = document.createElement("div");
  viewport.className = "planet-viewport";

  // View Mode Switcher Toolbar
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "8px";
  toolbar.style.marginBottom = "12px";

  const sphereBtn = document.createElement("button");
  sphereBtn.type = "button";
  sphereBtn.className = "btn-secondary";
  sphereBtn.style.minHeight = "44px";
  sphereBtn.style.padding = "8px 16px";
  sphereBtn.style.borderRadius = "8px";
  sphereBtn.style.border = "1px solid #475569";
  sphereBtn.style.backgroundColor = state.viewMode === "sphere" ? "#38bdf8" : "#1e293b";
  sphereBtn.style.color = state.viewMode === "sphere" ? "#0f172a" : "#f8fafc";
  sphereBtn.style.cursor = "pointer";
  sphereBtn.textContent = "Toàn Cảnh Cầu";

  const gridBtn = document.createElement("button");
  gridBtn.type = "button";
  gridBtn.className = "btn-secondary";
  gridBtn.style.minHeight = "44px";
  gridBtn.style.padding = "8px 16px";
  gridBtn.style.borderRadius = "8px";
  gridBtn.style.border = "1px solid #475569";
  gridBtn.style.backgroundColor = state.viewMode === "grid" ? "#38bdf8" : "#1e293b";
  gridBtn.style.color = state.viewMode === "grid" ? "#0f172a" : "#f8fafc";
  gridBtn.style.cursor = "pointer";
  gridBtn.textContent = "Bản Đồ Lưới (12x12)";

  function updateViewButtons(): void {
    sphereBtn.style.backgroundColor = state.viewMode === "sphere" ? "#38bdf8" : "#1e293b";
    sphereBtn.style.color = state.viewMode === "sphere" ? "#0f172a" : "#f8fafc";
    gridBtn.style.backgroundColor = state.viewMode === "grid" ? "#38bdf8" : "#1e293b";
    gridBtn.style.color = state.viewMode === "grid" ? "#0f172a" : "#f8fafc";
  }

  sphereBtn.addEventListener("click", () => {
    state.viewMode = "sphere";
    updateViewButtons();
  });

  gridBtn.addEventListener("click", () => {
    state.viewMode = "grid";
    updateViewButtons();
  });

  toolbar.appendChild(sphereBtn);
  toolbar.appendChild(gridBtn);
  viewport.appendChild(toolbar);

  // Active Planet Info Tag
  const planetBanner = document.createElement("div");
  planetBanner.style.marginBottom = "8px";
  planetBanner.style.fontSize = "0.95rem";
  planetBanner.style.fontWeight = "600";
  planetBanner.style.color = "#38bdf8";
  planetBanner.textContent = "Chưa có hành tinh. Vui lòng gieo mầm bên dưới.";
  viewport.appendChild(planetBanner);

  const canvas = document.createElement("canvas");
  canvas.className = "planet-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", t("a11y.planetCanvasAlt"));
  canvas.style.cursor = "crosshair";
  viewport.appendChild(canvas);

  // Tile Info Inspector
  const tileInspector = document.createElement("div");
  tileInspector.style.marginTop = "8px";
  tileInspector.style.padding = "10px 14px";
  tileInspector.style.borderRadius = "8px";
  tileInspector.style.backgroundColor = "#1e293b";
  tileInspector.style.border = "1px solid #334155";
  tileInspector.style.fontSize = "0.85rem";
  tileInspector.style.color = "#cbd5e1";
  tileInspector.textContent = "Nhấp chuột vào một ô trên bản đồ lưới để xem thông tin địa hình.";
  viewport.appendChild(tileInspector);

  mainStage.appendChild(viewport);

  // Canvas Click Handler to inspect tile
  canvas.addEventListener("click", (e) => {
    if (state.viewMode !== "grid" || !state.activePlanet) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const w = rect.width || 360;
    const h = rect.height || 360;
    const gridSize = state.activePlanet.grid_size || 12;
    const padding = 16;
    const availableSize = Math.min(w, h) - padding * 2;
    const cellSize = availableSize / gridSize;
    const startX = (w - availableSize) / 2;
    const startY = (h - availableSize) / 2;

    const tileX = Math.floor((clickX - startX) / cellSize);
    const tileY = Math.floor((clickY - startY) / cellSize);

    if (tileX >= 0 && tileX < gridSize && tileY >= 0 && tileY < gridSize) {
      const tile = state.activePlanet.tiles.find((t) => t.x === tileX && t.y === tileY);
      if (tile) {
        state.selectedTile = tile;
        const elemDef = ELEMENT_DEFINITIONS[tile.element];
        tileInspector.textContent = `Ô (${tile.x}, ${tile.y}) — Nguyên tố: ${elemDef.nameVi} ${elemDef.symbol} | Địa hình: ${tile.biome} | Độ giàu: ${tile.richness}/5`;
      }
    }
  });

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

  // Planet Creation Panel
  const creationPanel = createPlanetCreationPanel({
    selectedElement: state.selectedElement,
    onSelectElement: (elem) => {
      state.selectedElement = elem;
      updateActiveButton();
      updateInfoCard();
    },
    onPlanetCreated: (planetData) => {
      state.activePlanet = planetData;
      state.selectedElement = planetData.primary_element;
      state.viewMode = "grid";
      updateViewButtons();
      updateActiveButton();
      updateInfoCard();

      planetBanner.textContent = `★ Tinh Cầu: ${planetData.name} (${ELEMENT_DEFINITIONS[planetData.primary_element].nameVi}) — Seed: ${planetData.seed}`;
      creationPanel.style.display = "none";
    },
  });
  paletteSection.appendChild(creationPanel);

  // Breeding & Codex Section (T2.8)
  const initialCreatures: AvailableCreature[] = [
    {
      id: "demo-c-1",
      speciesKey: "thiet_giap_thu",
      name: "Thiết Giáp Thú (Kim)",
      genome: {
        primary: "metal",
        secondary: null,
        stats: { qi: 30, guard: 50, agility: 20, harmony: 20, chaos: 10 },
        traits: ["solid_armor"],
        generation: 1,
        inbreeding: 0,
      },
    },
    {
      id: "demo-c-2",
      speciesKey: "bang_tinh_ngu",
      name: "Băng Tinh Ngư (Thủy)",
      genome: {
        primary: "water",
        secondary: null,
        stats: { qi: 35, guard: 25, agility: 40, harmony: 30, chaos: 10 },
        traits: ["water_skin"],
        generation: 1,
        inbreeding: 0,
      },
    },
    {
      id: "demo-c-3",
      speciesKey: "thien_loi_dieu",
      name: "Thiên Lôi Điêu (Lôi)",
      genome: {
        primary: "thunder",
        secondary: null,
        stats: { qi: 45, guard: 20, agility: 55, harmony: 15, chaos: 30 },
        traits: ["thunder_wings"],
        generation: 1,
        inbreeding: 0,
      },
    },
  ];

  const breedingPanel = createBreedingPanel({
    planetId: state.activePlanet?.id || "demo-planet",
    creatures: initialCreatures,
    onBreed: async () => {
      // In web demo, provide instant visual response
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  });
  paletteSection.appendChild(breedingPanel);

  const codexPanel = createCodexPanel({
    unlockedSpeciesKeys: ["thiet_giap_thu", "bang_tinh_ngu"],
    unlockedItemKeys: ["raw_metal_ore", "raw_water_drop", "iron_essence"],
  });
  paletteSection.appendChild(codexPanel);

  // Chat Panel (T3.5)
  const chatTransport = new SupabaseChatTransport();
  const chatPanel = createChatPanel({
    currentUserId: "guest-voyager",
    planetId: state.activePlanet?.id,
    transport: chatTransport,
  });
  paletteSection.appendChild(chatPanel);

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
    const width = Math.max(rect.width || 360, 240);
    const height = Math.max(rect.height || 360, 240);
    try {
      ctx = setupCanvasDpi(canvas, width, height);
    } catch {
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
    const w = rect.width || 360;
    const h = rect.height || 360;

    if (ctx) {
      const planetState: PlanetState = {
        element: state.selectedElement,
        rotation: state.rotation,
        pulsePhase: state.pulsePhase,
        tiles: state.activePlanet?.tiles,
        gridSize: state.activePlanet?.grid_size || 12,
        viewMode: state.viewMode,
        selectedTile: state.selectedTile
          ? { x: state.selectedTile.x, y: state.selectedTile.y }
          : null,
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
