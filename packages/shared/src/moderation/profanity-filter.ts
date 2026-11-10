export interface ProfanityFilterResult {
  readonly hasProfanity: boolean;
  readonly filteredText: string;
}

const CHAR_MAP: Record<string, string> = {
  à: "a",
  á: "a",
  ả: "a",
  ã: "a",
  ạ: "a",
  ă: "a",
  ằ: "a",
  ắ: "a",
  ẳ: "a",
  ẵ: "a",
  ặ: "a",
  â: "a",
  ầ: "a",
  ấ: "a",
  ẩ: "a",
  ẫ: "a",
  ậ: "a",
  è: "e",
  é: "e",
  ẻ: "e",
  ẽ: "e",
  ẹ: "e",
  ê: "e",
  ề: "e",
  ế: "e",
  ể: "e",
  ễ: "e",
  ệ: "e",
  ì: "i",
  í: "i",
  ỉ: "i",
  ĩ: "i",
  ị: "i",
  ò: "o",
  ó: "o",
  ỏ: "o",
  õ: "o",
  ọ: "o",
  ô: "o",
  ồ: "o",
  ố: "o",
  ổ: "o",
  ỗ: "o",
  ộ: "o",
  ơ: "o",
  ờ: "o",
  ớ: "o",
  ở: "o",
  ỡ: "o",
  ợ: "o",
  ù: "u",
  ú: "u",
  ủ: "u",
  ũ: "u",
  ụ: "u",
  ư: "u",
  ừ: "u",
  ứ: "u",
  ử: "u",
  ữ: "u",
  ự: "u",
  ỳ: "y",
  ý: "y",
  ỷ: "y",
  ỹ: "y",
  ỵ: "y",
  đ: "d",
  // Leetspeak replacements (1:1 length)
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  $: "s",
};

/**
 * Normalizes text 1-to-1 preserving exact character indices.
 */
export function normalizeVietnameseText(input: string): string {
  const chars = input.toLowerCase().split("");
  return chars.map((c) => CHAR_MAP[c] ?? c).join("");
}

// Word boundary or punctuation boundary regexes
const PROFANE_REGEXES: readonly RegExp[] = [
  /\b(d[\W_]*[mn]|d[\W_]*m[\W_]*m|d[\W_]*c[\W_]*[ml]|v[\W_]*[ck][\W_]*l|v[\W_]*l|c[\W_]*m[\W_]*n[\W_]*l?)\b/gi,
  /\b(d[\W_]*[i|j|y][\W_]*t|d[\W_]*[u|uc])(\s*(me|ma|cha|con|cu))?\b/gi,
  /\b(l[\W_]*[o0*][\W_]*n|b[\W_]*[u|o][\W_]*o[\W_]*i|c[\W_]*[a4*][\W_]*c|chim|cu)\b/gi,
  /\b(d[\W_]*[e3][\W_]*[olch])\b/gi,
  /\b(oc[\W_]*cho|cho[\W_]*de|do[\W_]*cho)\b/gi,
  /\b(chich|phap)\b/gi,
];

/**
 * Pure profanity filtering function (GDD 05 & T3.3).
 * Preserves clean content, detects evasions, masks profane spans with asterisks.
 */
export function filterProfanity(rawText: string): ProfanityFilterResult {
  if (!rawText || rawText.trim().length === 0) {
    return { hasProfanity: false, filteredText: rawText };
  }

  const normalized = normalizeVietnameseText(rawText);
  const spansToMask: Array<{ start: number; end: number }> = [];

  for (const regex of PROFANE_REGEXES) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      spansToMask.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  if (spansToMask.length === 0) {
    return { hasProfanity: false, filteredText: rawText };
  }

  // Construct masked string based on matched spans
  const chars = rawText.split("");
  for (const span of spansToMask) {
    for (let i = span.start; i < span.end; i++) {
      if (chars[i] && chars[i] !== " ") {
        chars[i] = "*";
      }
    }
  }

  return {
    hasProfanity: true,
    filteredText: chars.join(""),
  };
}
