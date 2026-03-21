import { ResourceReportLink } from "../engine/types.js";

export class TextUtils {
    static normalizeText(text: string, maxExtractedChars: number = 0): string {
        const normalized = text.replace(/\s+/g, " ").trim();
        return normalized.length > maxExtractedChars && maxExtractedChars > 0
            ? normalized.slice(0, maxExtractedChars)
            : normalized;
    }

    static extractLinks(text: string, limit: number, type: string): ResourceReportLink[] {
        const found = text.match(/\bhttps?:\/\/[^\s<>"')\]]+/gi) ?? [];
        return [...new Set(found)].slice(0, limit).map((url) => ({
            type: type,
            url,
            text: url,
        }));
    }
}
