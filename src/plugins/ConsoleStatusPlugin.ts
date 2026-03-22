import type { IPlugin, PluginPhase, ResourceContext } from "../engine/types.js";
import { STATS_COLLECTOR_KEY, type StatsCollectorState } from "../engine/stats.js";
import { BasePlugin } from "../engine/BasePlugin.js";

type ConsoleStatusPluginOptions = {
    refreshEveryMs?: number;
    singleLine?: boolean;
};

type ConsoleStatusState = {
    lastPrintAt: number;
};

export class ConsoleStatusPlugin extends BasePlugin implements IPlugin {
    name = "console-status";
    phases: PluginPhase[] = ["periodic"];

    private readonly refreshEveryMs: number;
    private readonly singleLine: boolean;

    constructor(options: ConsoleStatusPluginOptions = {}) {
        super();
        this.refreshEveryMs = options.refreshEveryMs ?? 2000;
        this.singleLine = options.singleLine ?? true;
    }

    applies(): boolean {
        return true;
    }

    async run(_phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        const now = Date.now();

        const stateKey = "__consoleStatus";
        const pluginState = (ctx.engineState.any[stateKey] as ConsoleStatusState | undefined) ?? {
            lastPrintAt: 0,
        };

        if (now - pluginState.lastPrintAt < this.refreshEveryMs) {
            ctx.engineState.any[stateKey] = pluginState;
            return;
        }

        pluginState.lastPrintAt = now;
        ctx.engineState.any[stateKey] = pluginState;

        const collectorState = ctx.engineState.any[STATS_COLLECTOR_KEY] as
            | StatsCollectorState
            | undefined;

        if (!collectorState) {
            return;
        }

        const stats = collectorState.snapshot;
        const etaText = stats.etaIso ? this.formatDate(new Date(stats.etaIso)) : "N/A";

        const line =
            `[status] audited=${stats.auditedCount}` +
            ` | discovered=${stats.discoveredCount}` +
            ` | queue=${stats.queueSize}` +
            ` | active=${stats.activeWorkers}` +
            ` | ok=${stats.successCount}` +
            ` | errors=${stats.errorCount}` +
            ` | progress=${stats.percentComplete.toFixed(1)}%` +
            ` | speed=${stats.pagesPerMinute.toFixed(2)} pages/min` +
            ` | eta=${etaText}`;

        if (this.singleLine) {
            process.stdout.write(`\r${line.padEnd(180, " ")}`);
        } else {
            process.stdout.write(`${line}\n`);
        }
    }

    private formatDate(date: Date): string {
        return date.toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }
    includeInSummary(): boolean {
        return false;
    }

    isAuditPlugin(): boolean {
        return false;
    }
}
