export class TextUtils {
    static normalizeText(text: string, maxExtractedChars: number = 0): string {
        const normalized = text.replace(/\s+/g, " ").trim();
        return normalized.length > maxExtractedChars && maxExtractedChars > 0
            ? normalized.slice(0, maxExtractedChars)
            : normalized;
    }
}
