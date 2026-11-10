import type { Genome } from "@tinh-hoa/shared";
import { ELEMENT_DEFINITIONS, type ElementKey } from "@tinh-hoa/shared";

export interface CreatureRenderOptions {
  size: number; // e.g. 128
  centerX: number;
  centerY: number;
}

export interface DrawOperation {
  op: "arc" | "rect" | "polygon" | "gradient" | "stroke" | "badge";
  params: Record<string, unknown>;
}

export interface CreatureDrawLog {
  primaryElement: ElementKey;
  secondaryElement: ElementKey | null;
  operations: DrawOperation[];
}

/**
 * Pure procedural Canvas 2D renderer for creatures based on their Genome (GDD 5 & T2.6).
 * Combines base elemental body + dual-element color blend + trait patterns + elemental badge.
 * Returns an execution log of operations enabling deterministic snapshot testing without headless image diffing.
 */
export function renderCreature(
  ctx: CanvasRenderingContext2D,
  genome: Genome,
  options: CreatureRenderOptions,
): CreatureDrawLog {
  const { size, centerX, centerY } = options;
  const radius = size * 0.35;
  const log: DrawOperation[] = [];

  const primaryDef = ELEMENT_DEFINITIONS[genome.primary];
  const primaryColor = primaryDef?.pastelColor || "#4A90E2";
  const secondaryColor = genome.secondary
    ? ELEMENT_DEFINITIONS[genome.secondary]?.pastelColor || "#F5A623"
    : "#FFFFFF";

  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. Dual-element radial/linear gradient blend
  const gradient = ctx.createRadialGradient(
    -radius * 0.3,
    -radius * 0.3,
    radius * 0.1,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);
  ctx.fillStyle = gradient;

  log.push({
    op: "gradient",
    params: { primaryColor, secondaryColor, radius },
  });

  // 2. Base Elemental Shape
  ctx.beginPath();
  switch (genome.primary) {
    case "metal": {
      // Hexagonal armor shape
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      log.push({ op: "polygon", params: { sides: 6, radius } });
      break;
    }
    case "wood": {
      // Teardrop / Sprout body
      ctx.ellipse(0, 0, radius * 0.8, radius, 0, 0, Math.PI * 2);
      ctx.fill();
      log.push({ op: "arc", params: { shape: "ellipse", rx: radius * 0.8, ry: radius } });
      break;
    }
    case "water": {
      // Organic slime droplet
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      log.push({ op: "arc", params: { shape: "circle", radius } });
      break;
    }
    case "fire": {
      // Fiery diamond/pointed apex
      ctx.moveTo(0, -radius * 1.2);
      ctx.lineTo(radius * 0.85, radius * 0.7);
      ctx.lineTo(0, radius * 0.4);
      ctx.lineTo(-radius * 0.85, radius * 0.7);
      ctx.closePath();
      ctx.fill();
      log.push({ op: "polygon", params: { shape: "flame_diamond", radius } });
      break;
    }
    case "earth":
    default: {
      // Sturdy dome / rounded block
      ctx.arc(0, radius * 0.1, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      log.push({ op: "arc", params: { shape: "dome", radius: radius * 0.9 } });
      break;
    }
  }

  // 3. Body Stroke
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.stroke();
  log.push({ op: "stroke", params: { lineWidth: 3 } });

  // 4. Trait Patterns
  for (const trait of genome.traits) {
    if (trait === "photosynthesis") {
      // Leaf crest on head
      ctx.beginPath();
      ctx.arc(0, -radius * 0.9, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "#52C41A";
      ctx.fill();
      log.push({ op: "arc", params: { trait: "photosynthesis", color: "#52C41A" } });
    } else if (trait === "iron_skin" || trait === "hardened_shell") {
      // Armor plates
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI, true);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.stroke();
      log.push({ op: "stroke", params: { trait: "iron_skin" } });
    } else if (trait === "blazing_spark") {
      // Crown spark
      ctx.fillStyle = "#FF7A45";
      ctx.fillRect(-radius * 0.15, -radius * 1.1, radius * 0.3, radius * 0.3);
      log.push({ op: "rect", params: { trait: "blazing_spark", color: "#FF7A45" } });
    }
  }

  // 5. Eyes based on Harmony vs Chaos
  const isGentle = genome.stats.harmony >= genome.stats.chaos;
  const eyeRadius = isGentle ? radius * 0.16 : radius * 0.12;
  const eyeOffsetX = radius * 0.35;
  const eyeOffsetY = -radius * 0.1;

  ctx.fillStyle = "#1F1F1F";
  ctx.beginPath();
  ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Eye specular highlights
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(
    -eyeOffsetX - eyeRadius * 0.25,
    eyeOffsetY - eyeRadius * 0.25,
    eyeRadius * 0.35,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    eyeOffsetX - eyeRadius * 0.25,
    eyeOffsetY - eyeRadius * 0.25,
    eyeRadius * 0.35,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  log.push({
    op: "arc",
    params: { eyeType: isGentle ? "gentle" : "piercing", eyeRadius },
  });

  // 6. Central Elemental Badge / Crest
  ctx.beginPath();
  ctx.arc(0, radius * 0.45, radius * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();

  log.push({
    op: "badge",
    params: { element: genome.primary, badgeRadius: radius * 0.18 },
  });

  ctx.restore();

  return {
    primaryElement: genome.primary,
    secondaryElement: genome.secondary,
    operations: log,
  };
}
