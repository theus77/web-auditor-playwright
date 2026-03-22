import type { IPlugin, PluginPhase, ResourceContext } from "../engine/types.js";
import {
    createEmptyStats,
    STATS_COLLECTOR_KEY,
    type CrawlStats,
    type StatsCollectorState,
    type StatsSample,
} from "../engine/stats.js";
import { BasePlugin } from "../engine/BasePlugin.js";

type StatsCollectorPluginOptions = {
    rollingWindowSize?: number;
};

export class StatsCollectorPlugin extends BasePlugin implements IPlugin {
    name = "stats-collector";
    phases: PluginPhase[] = ["periodic"];

    private readonly rollingWindowSize: number;

    constructor(options: StatsCollectorPluginOptions = {}) {
        super();
        this.rollingWindowSize = options.rollingWindowSize ?? 10;
    }

    applies(): boolean {
        return true;
    }

    async run(_phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        const now = Date.now();
        const current = this.getState(ctx);

        current.samples.push({
            timestamp: now,
            processedCount: ctx.engineState.processedCount,
        });

        if (current.samples.length > this.rollingWindowSize) {
            current.samples.shift();
        }

        current.lastUpdatedAt = now;
        current.snapshot = this.computeSnapshot(ctx, current.samples, now);

        ctx.engineState.any[STATS_COLLECTOR_KEY] = current;
    }

    private getState(ctx: ResourceContext): StatsCollectorState {
        const existing = ctx.engineState.any[STATS_COLLECTOR_KEY] as
            | StatsCollectorState
            | undefined;

        if (existing) {
            return existing;
        }

        return {
            lastUpdatedAt: 0,
            samples: [],
            snapshot: createEmptyStats(),
        };
    }

    private computeSnapshot(ctx: ResourceContext, samples: StatsSample[], now: number): CrawlStats {
        const startedAtMs = new Date(ctx.engineState.startedAt).getTime();
        const elapsedMs = Math.max(1, now - startedAtMs);
        const elapsedMinutes = elapsedMs / 60000;

        const auditedCount = ctx.engineState.processedCount;
        const discoveredCount = ctx.engineState.seen.size;
        const queueSize = ctx.engineState.queueSize;
        const activeWorkers = ctx.engineState.activeWorkers;
        const successCount = ctx.engineState.successCount;
        const errorCount = ctx.engineState.errorCount;

        const pagesPerMinute = this.computeRollingPagesPerMinute(
            samples,
            auditedCount,
            elapsedMinutes,
        );

        const knownRemaining = Math.max(0, queueSize + activeWorkers);
        const targetEstimate = Math.min(
            Math.max(discoveredCount, auditedCount + knownRemaining),
            ctx.engineState.maxPages,
        );

        const percentComplete =
            targetEstimate > 0 ? Math.min((auditedCount / targetEstimate) * 100, 100) : 0;

        const remainingPagesEstimate = Math.max(0, targetEstimate - auditedCount);

        const etaIso =
            pagesPerMinute > 0
                ? new Date(now + (remainingPagesEstimate / pagesPerMinute) * 60000).toISOString()
                : null;

        return {
            auditedCount,
            discoveredCount,
            queueSize,
            activeWorkers,
            successCount,
            errorCount,
            percentComplete,
            pagesPerMinute,
            etaIso,
            elapsedMs,
            remainingPagesEstimate,
        };
    }

    private computeRollingPagesPerMinute(
        samples: StatsSample[],
        auditedCount: number,
        elapsedMinutes: number,
    ): number {
        if (samples.length < 2) {
            return auditedCount / Math.max(elapsedMinutes, 1 / 60000);
        }

        const first = samples[0];
        const last = samples[samples.length - 1];

        const deltaPages = last.processedCount - first.processedCount;
        const deltaMinutes = Math.max((last.timestamp - first.timestamp) / 60000, 1 / 60000);

        return deltaPages / deltaMinutes;
    }
    includeInSummary(): boolean {
        return false;
    }

    isAuditPlugin(): boolean {
        return false;
    }
}
