import { franc } from "franc";

import { BasePlugin } from "../engine/BasePlugin.js";
import { IPlugin, PluginPhase, ResourceContext } from "../engine/types.js";
import { TextUtils } from "../utils/TextUtils.js";
import { LocaleUtils } from "../utils/LocaleUtils.js";

type LanguageDetectionPluginOptions = {
    minLength?: number;
    maxSampleLength?: number;
    overwriteExistingLocale?: boolean;
};

export class LanguageDetectionPlugin extends BasePlugin implements IPlugin {
    name = "language-detection";
    phases: PluginPhase[] = ["before-finally"];

    private readonly minLength: number;
    private readonly maxSampleLength: number;
    private readonly overwriteExistingLocale: boolean;

    constructor(options: LanguageDetectionPluginOptions = {}) {
        super();
        this.minLength = options.minLength ?? 100;
        this.maxSampleLength = options.maxSampleLength ?? 5000;
        this.overwriteExistingLocale = options.overwriteExistingLocale ?? false;
    }

    applies(ctx: ResourceContext): boolean {
        return typeof ctx.report.content === "string" && ctx.report.content.trim().length > 0;
    }

    async run(_phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        const content = ctx.report.content;
        if (typeof content !== "string") {
            return;
        }

        if (ctx.report.locale && !this.overwriteExistingLocale) {
            return;
        }

        const sample = TextUtils.normalizeText(content, this.maxSampleLength);

        if (sample.length < this.minLength) {
            this.registerInfo(
                ctx,
                "LANGUAGE_DETECTION_SKIPPED",
                `Language detection skipped because the content is shorter than ${this.minLength} characters.`,
            );
            return;
        }

        const lang3 = franc(sample, { minLength: this.minLength });

        if (lang3 === "und") {
            this.registerInfo(
                ctx,
                "LANGUAGE_UNDETERMINED",
                "Unable to determine content language.",
            );
            return;
        }
        const lang1 = LocaleUtils.toIso639_1(lang3);
        ctx.report.locale = typeof lang1 === "string" && lang1.length > 0 ? lang1 : lang3;

        this.register(ctx);
    }

    isAuditPlugin(): boolean {
        return false;
    }
}
