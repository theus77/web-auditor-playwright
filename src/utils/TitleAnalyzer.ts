export type TitleIssueSeverity = "info" | "warning" | "error";

export type TitleIssueCode =
    | "TITLE_MISSING"
    | "TITLE_TOO_SHORT"
    | "TITLE_TOO_LONG"
    | "TITLE_BRAND_TOO_LONG"
    | "TITLE_BRAND_DUPLICATED"
    | "TITLE_MAIN_TOO_SHORT"
    | "TITLE_TOO_MANY_PARTS";

export type TitleIssue = {
    code: TitleIssueCode;
    severity: TitleIssueSeverity;
    message: string;
};

export type TitleAnalysis = {
    raw: string | null;
    normalized: string | null;
    length: number;
    status: "missing" | "too_short" | "ok" | "too_long";
    separator: string | null;
    parts: string[];
    mainTitle: string | null;
    brand: string | null;
    hasBrand: boolean;
    brandAtEnd: boolean;
    issues: TitleIssue[];
};

type TitleAnalyzerOptions = {
    minLength?: number;
    maxLength?: number;
    idealMinLength?: number;
    idealMaxLength?: number;
    maxBrandLength?: number;
    separators?: string[];
};

export class TitleAnalyzer {
    private readonly minLength: number;
    private readonly maxLength: number;
    private readonly idealMinLength: number;
    private readonly idealMaxLength: number;
    private readonly maxBrandLength: number;
    private readonly separators: string[];

    constructor(options: TitleAnalyzerOptions = {}) {
        this.minLength = options.minLength ?? 30;
        this.maxLength = options.maxLength ?? 65;
        this.idealMinLength = options.idealMinLength ?? 50;
        this.idealMaxLength = options.idealMaxLength ?? 60;
        this.maxBrandLength = options.maxBrandLength ?? 25;
        this.separators = options.separators ?? ["|", " - ", " – ", " — ", " · "];
    }

    analyze(input: string | null | undefined): TitleAnalysis {
        const raw = input ?? null;
        const normalized = this.normalizeTitle(raw);
        const length = normalized?.length ?? 0;

        if (!normalized) {
            return {
                raw,
                normalized: null,
                length: 0,
                status: "missing",
                separator: null,
                parts: [],
                mainTitle: null,
                brand: null,
                hasBrand: false,
                brandAtEnd: false,
                issues: [
                    {
                        code: "TITLE_MISSING",
                        severity: "error",
                        message: "Title is missing.",
                    },
                ],
            };
        }

        const separator = this.detectSeparator(normalized);
        const parts = separator
            ? normalized
                  .split(separator)
                  .map((part) => part.trim())
                  .filter(Boolean)
            : [normalized];

        const hasBrand = parts.length > 1;
        const brandAtEnd = hasBrand;
        const brand = hasBrand ? parts[parts.length - 1] : null;
        const mainTitle = hasBrand
            ? parts
                  .slice(0, -1)
                  .join(separator ?? undefined)
                  .trim()
            : normalized;

        const issues: TitleIssue[] = [];

        if (length < this.minLength) {
            issues.push({
                code: "TITLE_TOO_SHORT",
                severity: "warning",
                message: `Title is too short (${length} chars).`,
            });
        }

        if (length > this.maxLength) {
            issues.push({
                code: "TITLE_TOO_LONG",
                severity: "warning",
                message: `Title is too long (${length} chars).`,
            });
        }

        if (hasBrand && brand && brand.length > this.maxBrandLength) {
            issues.push({
                code: "TITLE_BRAND_TOO_LONG",
                severity: "warning",
                message: `Brand part is too long (${brand.length} chars).`,
            });
        }

        if (hasBrand && brand && mainTitle.toLowerCase().includes(brand.toLowerCase())) {
            issues.push({
                code: "TITLE_BRAND_DUPLICATED",
                severity: "warning",
                message: "Brand appears to be duplicated in the main title.",
            });
        }

        if (mainTitle.length > 0 && mainTitle.length < 20) {
            issues.push({
                code: "TITLE_MAIN_TOO_SHORT",
                severity: "warning",
                message: `Main title is too short (${mainTitle.length} chars).`,
            });
        }

        if (parts.length > 3) {
            issues.push({
                code: "TITLE_TOO_MANY_PARTS",
                severity: "info",
                message: `Title contains many parts (${parts.length}).`,
            });
        }

        const status = this.computeStatus(length);

        return {
            raw,
            normalized,
            length,
            status,
            separator,
            parts,
            mainTitle,
            brand,
            hasBrand,
            brandAtEnd,
            issues,
        };
    }

    private normalizeTitle(input: string | null): string | null {
        if (!input) {
            return null;
        }

        const normalized = input.replace(/\s+/g, " ").trim();
        return normalized.length > 0 ? normalized : null;
    }

    private detectSeparator(title: string): string | null {
        for (const separator of this.separators) {
            if (title.includes(separator)) {
                return separator;
            }
        }

        return null;
    }

    private computeStatus(length: number): TitleAnalysis["status"] {
        if (length === 0) {
            return "missing";
        }

        if (length < this.minLength) {
            return "too_short";
        }

        if (length > this.maxLength) {
            return "too_long";
        }

        return "ok";
    }

    isIdealLength(length: number): boolean {
        return length >= this.idealMinLength && length <= this.idealMaxLength;
    }
}
