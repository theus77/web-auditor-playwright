import type { ConsoleMessage } from "playwright";

import { BasePlugin } from "../engine/BasePlugin.js";
import { IPlugin, PluginPhase, ResourceContext } from "../engine/types.js";

type ConsolePluginOptions = {
    auditOnlyStartUrl?: boolean;
    includeWarnings?: boolean;
    ignoredTextPatterns?: RegExp[];
    ignoredTypes?: string[];
};

type ConsoleMessageEntry = {
    type: "error" | "warning";
    text: string;
    location?: {
        url?: string;
        lineNumber?: number;
        columnNumber?: number;
    };
};

type ConsoleState = {
    attached: boolean;
    listener: ((msg: ConsoleMessage) => void) | null;
    messages: ConsoleMessageEntry[];
};

const DEFAULT_IGNORED_TEXT_PATTERNS: RegExp[] = [
    /favicon\.ico/i,
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-extension:\/\//i,
    /extensions?\//i,
    /googletagmanager/i,
    /google-analytics/i,
    /gtag\/js/i,
    /clarity\.ms/i,
    /hotjar/i,
    /facebook\.net/i,
    /doubleclick/i,
    /Failed to load resource: the server responded with a status of 404.*favicon/i,
];

const DEFAULT_IGNORED_TYPES = ["info", "log", "debug"];

export class ConsolePlugin extends BasePlugin implements IPlugin {
    name = "console";
    phases: PluginPhase[] = ["beforeGoto", "beforeFinally"];

    private readonly auditOnlyStartUrl: boolean;
    private readonly includeWarnings: boolean;
    private readonly ignoredTextPatterns: RegExp[];
    private readonly ignoredTypes: Set<string>;

    constructor(options: ConsolePluginOptions = {}) {
        super();
        this.auditOnlyStartUrl = options.auditOnlyStartUrl ?? true;
        this.includeWarnings = options.includeWarnings ?? true;
        this.ignoredTextPatterns = options.ignoredTextPatterns ?? DEFAULT_IGNORED_TEXT_PATTERNS;
        this.ignoredTypes = new Set(
            (options.ignoredTypes ?? DEFAULT_IGNORED_TYPES).map((value) => value.toLowerCase()),
        );
    }

    applies(ctx: ResourceContext): boolean {
        return !this.auditOnlyStartUrl || ctx.depth === 0;
    }

    async run(phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        if (this.auditOnlyStartUrl && ctx.depth !== 0) {
            return;
        }

        const state = this.getState(ctx);

        if (phase === "beforeGoto") {
            this.attachListener(ctx, state);
            return;
        }

        if (phase === "beforeFinally") {
            this.detachListener(ctx, state);
            this.reportConsoleFindings(ctx, state);
        }
    }

    private attachListener(ctx: ResourceContext, state: ConsoleState): void {
        if (state.attached) {
            return;
        }

        const listener = (msg: ConsoleMessage) => {
            const entry = this.toConsoleMessageEntry(msg);
            if (!entry) {
                return;
            }

            if (this.shouldIgnore(entry)) {
                return;
            }

            state.messages.push(entry);
        };

        ctx.page.on("console", listener);

        state.listener = listener;
        state.attached = true;
    }

    private detachListener(ctx: ResourceContext, state: ConsoleState): void {
        if (!state.attached || !state.listener) {
            return;
        }

        ctx.page.off("console", state.listener);
        state.attached = false;
        state.listener = null;
    }

    private reportConsoleFindings(ctx: ResourceContext, state: ConsoleState): void {
        if (!ctx.report.is_web) {
            return;
        }

        const uniqueMessages = this.deduplicateMessages(state.messages);

        if (uniqueMessages.length === 0) {
            this.register(ctx);
            return;
        }

        const errors = uniqueMessages.filter((message) => message.type === "error");
        const warnings = uniqueMessages.filter((message) => message.type === "warning");

        if (errors.length === 0 && warnings.length === 0) {
            this.register(ctx);
            return;
        }

        if (errors.length > 0) {
            this.registerError(
                ctx,
                "CONSOLE_ERRORS_DETECTED",
                `Detected ${errors.length} unique console error(s).`,
                { errors },
            );
        }

        if (warnings.length > 0) {
            this.registerWarning(
                ctx,
                "CONSOLE_WARNINGS_DETECTED",
                `Detected ${warnings.length} unique console warning(s).`,
                { warnings },
            );
        }
    }

    private toConsoleMessageEntry(msg: ConsoleMessage): ConsoleMessageEntry | null {
        const rawType = msg.type().toLowerCase();
        const rawText = msg.text().trim();

        if (!rawText) {
            return null;
        }

        if (this.ignoredTypes.has(rawType)) {
            return null;
        }

        const normalizedType =
            rawType === "error"
                ? "error"
                : rawType === "warning" || rawType === "warn"
                  ? "warning"
                  : null;

        if (!normalizedType) {
            return null;
        }

        if (normalizedType === "warning" && !this.includeWarnings) {
            return null;
        }

        const rawLocation = msg.location();
        const hasLocation =
            typeof rawLocation.url === "string" ||
            typeof rawLocation.lineNumber === "number" ||
            typeof rawLocation.columnNumber === "number";

        return {
            type: normalizedType,
            text: rawText,
            location: hasLocation
                ? {
                      url: typeof rawLocation.url === "string" ? rawLocation.url : undefined,
                      lineNumber:
                          typeof rawLocation.lineNumber === "number"
                              ? rawLocation.lineNumber
                              : undefined,
                      columnNumber:
                          typeof rawLocation.columnNumber === "number"
                              ? rawLocation.columnNumber
                              : undefined,
                  }
                : undefined,
        };
    }

    private shouldIgnore(message: ConsoleMessageEntry): boolean {
        return this.ignoredTextPatterns.some((pattern) => pattern.test(message.text));
    }

    private deduplicateMessages(messages: ConsoleMessageEntry[]): ConsoleMessageEntry[] {
        const map = new Map<string, ConsoleMessageEntry>();

        for (const message of messages) {
            const key = [
                message.type,
                message.text,
                message.location?.url ?? "",
                message.location?.lineNumber ?? "",
                message.location?.columnNumber ?? "",
            ].join("|");

            if (!map.has(key)) {
                map.set(key, message);
            }
        }

        return [...map.values()];
    }

    private getState(ctx: ResourceContext): ConsoleState {
        const key = "consolePlugin";
        const existing = ctx.engineState.any[key];

        if (this.isConsoleState(existing)) {
            return existing;
        }

        const created: ConsoleState = {
            attached: false,
            listener: null,
            messages: [],
        };

        ctx.engineState.any[key] = created;
        return created;
    }

    private isConsoleState(value: unknown): value is ConsoleState {
        if (!value || typeof value !== "object") {
            return false;
        }

        const record = value as Record<string, unknown>;
        return (
            typeof record.attached === "boolean" &&
            (typeof record.listener === "function" || record.listener === null) &&
            Array.isArray(record.messages)
        );
    }
}
