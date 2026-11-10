import { clampStats } from "../schemas/genome.js";
import { SPECIES_BY_KEY, BASE_SPECIES } from "../config/species.js";
/**
 * Pure function: determine elemental relationship between two elements according to GDD 7.
 */
export function getElementRelation(a, b) {
    if (a === b) {
        return "same";
    }
    // Polar opposites: Light and Dark
    if ((a === "light" && b === "dark") || (a === "dark" && b === "light")) {
        return "polar";
    }
    // Generative cycles (Tương sinh):
    // Metal -> Water -> Wood -> Fire -> Earth -> Metal
    const generativeMap = {
        metal: "water",
        water: "wood",
        wood: "fire",
        fire: "earth",
        earth: "metal",
    };
    if (generativeMap[a] === b || generativeMap[b] === a) {
        return "generative";
    }
    // Destructive cycles (Tương khắc):
    // Metal -> Wood -> Earth -> Water -> Fire -> Metal
    const destructiveMap = {
        metal: "wood",
        wood: "earth",
        earth: "water",
        water: "fire",
        fire: "metal",
    };
    if (destructiveMap[a] === b || destructiveMap[b] === a) {
        return "destructive";
    }
    return "neutral";
}
const MUTATION_TRAITS = [
    "swift_step",
    "vital_aura",
    "hardened_shell",
    "qi_resonance",
    "wild_instinct",
    "radiant_glow",
];
/**
 * Pure function: breed two parent creatures according to GDD 7 rules.
 * Never uses Date.now() or Math.random(); strictly accepts clock and rng.
 */
export function breed(options) {
    const { parentA, parentB, catalyst, rng, clock } = options;
    const aGenome = parentA.genome;
    const bGenome = parentB.genome;
    const relation = getElementRelation(aGenome.primary, bGenome.primary);
    // 1. Determine Child Primary & Secondary Element
    let primaryElement;
    let secondaryElement = null;
    if (catalyst && rng.next() < 0.7) {
        // Catalyst forces orientation with 70% probability
        primaryElement = catalyst.element;
        secondaryElement =
            rng.next() < 0.5
                ? aGenome.primary
                : bGenome.primary !== primaryElement
                    ? bGenome.primary
                    : null;
    }
    else if (relation === "same") {
        primaryElement = aGenome.primary;
        secondaryElement = null;
    }
    else if (relation === "generative") {
        // 50/50 from parents, 20% secondary
        primaryElement = rng.next() < 0.5 ? aGenome.primary : bGenome.primary;
        if (rng.next() < 0.2) {
            secondaryElement = primaryElement === aGenome.primary ? bGenome.primary : aGenome.primary;
        }
    }
    else if (relation === "destructive") {
        // 15% hybrid mutation chance
        if (rng.next() < 0.15) {
            primaryElement = rng.next() < 0.5 ? aGenome.primary : bGenome.primary;
            secondaryElement = primaryElement === aGenome.primary ? bGenome.primary : aGenome.primary;
        }
        else {
            primaryElement = rng.next() < 0.5 ? aGenome.primary : bGenome.primary;
        }
    }
    else if (relation === "polar") {
        // 5% chance of extremely rare Thunder mutation
        if (rng.next() < 0.05) {
            primaryElement = "thunder";
            secondaryElement = null;
        }
        else {
            primaryElement = rng.next() < 0.5 ? "light" : "dark";
            secondaryElement = primaryElement === "light" ? "dark" : "light";
        }
    }
    else {
        primaryElement = rng.next() < 0.5 ? aGenome.primary : bGenome.primary;
    }
    // 2. Calculate Inbreeding Level
    const isSameLineage = parentA.speciesKey === parentB.speciesKey ||
        (parentA.parentAId &&
            parentB.parentAId &&
            (parentA.parentAId === parentB.parentAId || parentA.parentAId === parentB.parentBId));
    const childInbreeding = Math.max(aGenome.inbreeding, bGenome.inbreeding) + (isSameLineage ? 1 : 0);
    const childGeneration = Math.max(aGenome.generation, bGenome.generation) + 1;
    // Inbreeding penalty: kicks in when inbreeding > 2, reduces stats up to 50%
    const inbreedingPenalty = childInbreeding > 2 ? Math.min(0.5, (childInbreeding - 2) * 0.05) : 0;
    // 3. Calculate Base Stats from Parents Average with Relation Modifiers
    const calculateStat = (statA, statB) => {
        let base = (statA + statB) / 2;
        // Elemental relationship bonus / variation
        if (relation === "same") {
            base *= 1.05; // +5% purebred bonus
        }
        else if (relation === "generative") {
            base *= 1.03; // +3% harmonious bonus
        }
        else if (relation === "destructive") {
            // High fluctuation: [-15%..+15%]
            const fluctuation = (rng.next() * 2 - 1) * 0.15;
            base *= 1 + fluctuation;
        }
        else if (relation === "polar") {
            // Extreme fluctuation: [-20%..+25%]
            const fluctuation = (rng.next() * 2 - 1) * 0.225;
            base *= 1 + fluctuation;
        }
        // Chaos fluctuation: higher average chaos introduces random noise
        const avgChaos = (aGenome.stats.chaos + bGenome.stats.chaos) / 2;
        const chaosJitter = (rng.next() * 2 - 1) * (avgChaos / 100) * 0.15;
        base *= 1 + chaosJitter;
        // Apply inbreeding penalty
        if (inbreedingPenalty > 0) {
            base *= 1 - inbreedingPenalty;
        }
        return Math.round(base);
    };
    const rawStats = {
        qi: calculateStat(aGenome.stats.qi, bGenome.stats.qi),
        guard: calculateStat(aGenome.stats.guard, bGenome.stats.guard),
        agility: calculateStat(aGenome.stats.agility, bGenome.stats.agility),
        harmony: calculateStat(aGenome.stats.harmony, bGenome.stats.harmony),
        chaos: calculateStat(aGenome.stats.chaos, bGenome.stats.chaos),
    };
    // Clamp strictly within [1..100]
    const finalStats = clampStats(rawStats);
    // 4. Inherit Traits & Mutation (50% per trait, 5% random mutation)
    const availableTraits = Array.from(new Set([...aGenome.traits, ...bGenome.traits]));
    const childTraits = [];
    for (const trait of availableTraits) {
        if (childTraits.length >= 3)
            break;
        if (rng.next() < 0.5) {
            childTraits.push(trait);
        }
    }
    // 5% mutation chance to acquire a new trait
    if (childTraits.length < 3 && rng.next() < 0.05) {
        const unownedMutations = MUTATION_TRAITS.filter((t) => !childTraits.includes(t));
        if (unownedMutations.length > 0) {
            const idx = rng.nextInt(0, unownedMutations.length - 1);
            childTraits.push(unownedMutations[idx]);
        }
    }
    // 5. Determine Child Species Key
    // If primary matches parentA or parentB, inherit that species, otherwise pick compatible base species
    let childSpeciesKey;
    if (parentA.speciesKey in SPECIES_BY_KEY &&
        SPECIES_BY_KEY[parentA.speciesKey].element === primaryElement) {
        childSpeciesKey = parentA.speciesKey;
    }
    else if (parentB.speciesKey in SPECIES_BY_KEY &&
        SPECIES_BY_KEY[parentB.speciesKey].element === primaryElement) {
        childSpeciesKey = parentB.speciesKey;
    }
    else {
        const candidateSpecies = BASE_SPECIES.filter((s) => s.element === primaryElement);
        childSpeciesKey =
            candidateSpecies.length > 0
                ? candidateSpecies[rng.nextInt(0, candidateSpecies.length - 1)].key
                : parentA.speciesKey;
    }
    const childGenome = {
        primary: primaryElement,
        secondary: secondaryElement,
        stats: finalStats,
        traits: childTraits,
        generation: childGeneration,
        inbreeding: childInbreeding,
    };
    // 6. Hatch Duration & Effects
    // Base hatch time: 60 seconds + 10s per generation
    const hatchDurationSec = 60 + Math.min(300, childGeneration * 10);
    const nowMs = clock.now();
    const finishAtIso = new Date(nowMs + hatchDurationSec * 1000).toISOString();
    const effects = [
        {
            type: "create_job",
            kind: "breed",
            payload: {
                child_genome: childGenome,
                child_species_key: childSpeciesKey,
                parent_a_id: parentA.id,
                parent_b_id: parentB.id,
            },
            finish_at: finishAtIso,
        },
        // Deduct breeding resource cost (20 primary element resources)
        {
            type: "resource_delta",
            resource_key: primaryElement,
            delta: -20,
        },
    ];
    return {
        childGenome,
        childSpeciesKey,
        relation,
        hatchDurationSec,
        finishAtIso,
        effects,
    };
}
//# sourceMappingURL=breed.js.map