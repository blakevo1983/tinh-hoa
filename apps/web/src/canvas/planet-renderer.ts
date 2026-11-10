import { ELEMENT_DEFINITIONS, type ElementKey } from "@tinh-hoa/shared";

export interface PlanetState {
  element: ElementKey;
  rotation: number;
  pulsePhase: number;
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
      // ■ Square
      const s = size * 0.7;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      break;
    }
    case "light": {
      // ✦ Four-pointed star
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const radius = i % 2 === 0 ? half : half * 0.35;
        const angle = (i * Math.PI) / 4 - Math.PI / 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "dark": {
      // ● Solid circle
      ctx.beginPath();
      ctx.arc(x, y, half * 0.65, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "thunder": {
      // ϟ Lightning bolt
      ctx.beginPath();
      ctx.moveTo(x + half * 0.2, y - half);
      ctx.lineTo(x - half * 0.4, y);
      ctx.lineTo(x + half * 0.1, y);
      ctx.lineTo(x - half * 0.2, y + half);
      ctx.lineTo(x + half * 0.4, y - half * 0.1);
      ctx.lineTo(x - half * 0.1, y - half * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Pure rendering function for planet canvas.
 */
export function renderPlanet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PlanetState,
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.32;
  const pulseScale = 1 + Math.sin(state.pulsePhase) * 0.02;
  const radius = baseRadius * pulseScale;

  const def = ELEMENT_DEFINITIONS[state.element];
  const primaryColor = def.pastelColor;

  // 1. Atmosphere / Outer Aura Glow
  const glowGradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.4);
  glowGradient.addColorStop(0, `${primaryColor}44`); // 27% opacity
  glowGradient.addColorStop(0.6, `${primaryColor}18`); // 10% opacity
  glowGradient.addColorStop(1, `${primaryColor}00`); // transparent

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // 2. Main Planet Body (Circular Flat Surface with subtle soft radial shading)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Base background
  ctx.fillStyle = "#161b22";
  ctx.fill();

  // Planet shading gradient
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

  // 3. Continental / Biome Patches (Soft flat segments according to GDD 13)
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

  // 4. Center Core Emblem: The element's geometric symbol
  drawElementSymbol(ctx, state.element, 0, 0, radius * 0.48, "rgba(20, 24, 33, 0.85)");

  ctx.restore();

  // 5. Delicate rim highlight (lighting from top-left)
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
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
