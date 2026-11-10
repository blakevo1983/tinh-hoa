import { ELEMENT_DEFINITIONS, type ElementKey, type PlanetTile } from "@tinh-hoa/shared";

export interface PlanetState {
  element: ElementKey;
  rotation: number;
  pulsePhase: number;
  tiles?: PlanetTile[];
  gridSize?: number;
  viewMode?: "sphere" | "grid";
  selectedTile?: { x: number; y: number } | null;
}

export interface PlanetRendererOptions {
  canvas: HTMLCanvasElement;
  getState: () => PlanetState;
}

/**
 * Configure canvas for crisp rendering on high-DPI (Retina) screens.
 */
export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(displayWidth * dpr);
  canvas.height = Math.floor(displayHeight * dpr);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas rendering context");
  }

  ctx.scale(dpr, dpr);
  return ctx;
}

/**
 * Draw the geometric symbol of an element at a given position.
 */
export function drawElementSymbol(
  ctx: CanvasRenderingContext2D,
  element: ElementKey,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const half = size / 2;

  switch (element) {
    case "metal": {
      // ◆ Diamond
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y);
      ctx.lineTo(x, y + half);
      ctx.lineTo(x - half, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "wood": {
      // ❦ Floral leaf/sprout
      ctx.beginPath();
      ctx.arc(x, y - half * 0.3, half * 0.45, Math.PI, 0, false);
      ctx.arc(x, y + half * 0.2, half * 0.5, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
      // Stem
      ctx.beginPath();
      ctx.moveTo(x, y + half * 0.7);
      ctx.lineTo(x, y + half);
      ctx.stroke();
      break;
    }
    case "water": {
      // ◖ Semicircle / droplet
      ctx.beginPath();
      ctx.arc(x, y, half * 0.7, Math.PI / 2, (3 * Math.PI) / 2, false);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "fire": {
      // ▲ Triangle
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y + half * 0.8);
      ctx.lineTo(x - half, y + half * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "earth": {
      // ■ Solid square
      ctx.fillRect(x - half * 0.75, y - half * 0.75, size * 0.75, size * 0.75);
      break;
    }
    case "light": {
      // ✦ 4-pointed star
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.quadraticCurveTo(x, y, x + half, y);
      ctx.quadraticCurveTo(x, y, x, y + half);
      ctx.quadraticCurveTo(x, y, x - half, y);
      ctx.quadraticCurveTo(x, y, x, y - half);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "dark": {
      // ● Circle
      ctx.beginPath();
      ctx.arc(x, y, half * 0.75, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "thunder": {
      // ϟ Lightning zigzag
      ctx.beginPath();
      ctx.moveTo(x + half * 0.3, y - half);
      ctx.lineTo(x - half * 0.4, y - half * 0.05);
      ctx.lineTo(x + half * 0.1, y - half * 0.05);
      ctx.lineTo(x - half * 0.3, y + half);
      ctx.lineTo(x + half * 0.4, y + half * 0.05);
      ctx.lineTo(x - half * 0.1, y + half * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Render 2D Grid of planet tiles.
 */
export function renderPlanetGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PlanetState,
): void {
  const tiles = state.tiles;
  if (!tiles || tiles.length === 0) return;

  const gridSize = state.gridSize || 12;
  const padding = 16;
  const availableSize = Math.min(width, height) - padding * 2;
  const cellSize = availableSize / gridSize;

  const startX = (width - availableSize) / 2;
  const startY = (height - availableSize) / 2;

  ctx.save();

  for (const tile of tiles) {
    const tx = startX + tile.x * cellSize;
    const ty = startY + tile.y * cellSize;

    const elementDef = ELEMENT_DEFINITIONS[tile.element];
    const isSelected = state.selectedTile?.x === tile.x && state.selectedTile?.y === tile.y;

    // Tile Background
    ctx.fillStyle = isSelected ? "#ffffff" : `${elementDef.pastelColor}33`; // 20% opacity
    ctx.strokeStyle = isSelected ? elementDef.pastelColor : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = isSelected ? 2 : 1;

    // Rounded rectangle tile
    const r = 3;
    ctx.beginPath();
    ctx.roundRect(tx + 1, ty + 1, cellSize - 2, cellSize - 2, r);
    ctx.fill();
    ctx.stroke();

    // Element geometric symbol at center
    const symbolColor = isSelected ? "#0f172a" : elementDef.pastelColor;
    drawElementSymbol(
      ctx,
      tile.element,
      tx + cellSize / 2,
      ty + cellSize / 2,
      Math.max(10, cellSize * 0.45),
      symbolColor,
    );

    // Richness dots in top-right corner
    if (cellSize >= 20) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      for (let dot = 0; dot < tile.richness; dot++) {
        ctx.beginPath();
        ctx.arc(tx + cellSize - 4 - dot * 3.5, ty + 4, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Render 3D Sphere view of planet.
 */
export function renderPlanetSphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PlanetState,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.35;
  const pulseOffset = Math.sin(state.pulsePhase) * 2;
  const radius = baseRadius + pulseOffset;

  const elementDef = ELEMENT_DEFINITIONS[state.element];
  const primaryColor = elementDef.pastelColor;

  ctx.save();

  // 1. Atmosphere Aura (Soft outer glow)
  const auraGradient = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.35);
  auraGradient.addColorStop(0, `${primaryColor}66`);
  auraGradient.addColorStop(0.5, `${primaryColor}22`);
  auraGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = auraGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  // 2. Planet Sphere Body
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);

  const bodyGradient = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.1,
    cx,
    cy,
    radius,
  );
  bodyGradient.addColorStop(0, primaryColor);
  bodyGradient.addColorStop(0.85, primaryColor);
  bodyGradient.addColorStop(1, "#0d1117");

  ctx.fillStyle = bodyGradient;
  ctx.fill();

  // 3. Biome Patches
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.rotation);

  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const patchX = Math.cos(angle) * (radius * 0.45);
    const patchY = Math.sin(angle) * (radius * 0.45);
    ctx.beginPath();
    ctx.arc(patchX, patchY, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Center Core Emblem
  drawElementSymbol(ctx, state.element, 0, 0, radius * 0.48, "rgba(20, 24, 33, 0.85)");

  ctx.restore();

  // 5. Rim highlight
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Primary render function, routing to Sphere or Grid based on state.viewMode.
 */
export function renderPlanet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PlanetState,
): void {
  ctx.clearRect(0, 0, width, height);

  if (state.viewMode === "grid" && state.tiles && state.tiles.length > 0) {
    renderPlanetGrid(ctx, width, height, state);
  } else {
    renderPlanetSphere(ctx, width, height, state);
  }
}

/**
 * Controller to start and manage the animation loop cleanly.
 */
export function startPlanetAnimation(
  canvas: HTMLCanvasElement,
  getState: () => PlanetState,
): () => void {
  let isRunning = true;
  let animationFrameId: number;

  const displayWidth = canvas.clientWidth || 360;
  const displayHeight = canvas.clientHeight || 360;
  const ctx = setupCanvasDpi(canvas, displayWidth, displayHeight);

  const loop = () => {
    if (!isRunning) return;

    const state = getState();
    renderPlanet(ctx, displayWidth, displayHeight, state);

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);

  return () => {
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
  };
}
