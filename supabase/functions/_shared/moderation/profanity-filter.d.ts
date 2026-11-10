export interface ProfanityFilterResult {
    readonly hasProfanity: boolean;
    readonly filteredText: string;
}
/**
 * Normalizes text 1-to-1 preserving exact character indices.
 */
export declare function normalizeVietnameseText(input: string): string;
/**
 * Pure profanity filtering function (GDD 05 & T3.3).
 * Preserves clean content, detects evasions, masks profane spans with asterisks.
 */
export declare function filterProfanity(rawText: string): ProfanityFilterResult;
//# sourceMappingURL=profanity-filter.d.ts.map