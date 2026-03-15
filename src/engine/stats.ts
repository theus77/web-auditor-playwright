export type StatsSample = {
    timestamp: number;
    processedCount: number;
};

export type CrawlStats = {
    auditedCount: number;
    discoveredCount: number;
    queueSize: number;
    activeWorkers: number;
    successCount: number;
    errorCount: number;
    percentComplete: number;
    pagesPerMinute: number;
    etaIso: string | null;
    elapsedMs: number;
    remainingPagesEstimate: number;
};

export type StatsCollectorState = {
    lastUpdatedAt: number;
    samples: StatsSample[];
    snapshot: CrawlStats;
};

export const STATS_COLLECTOR_KEY = "__statsCollector";

export function createEmptyStats(): CrawlStats {
    return {
        auditedCount: 0,
        discoveredCount: 0,
        queueSize: 0,
        activeWorkers: 0,
        successCount: 0,
        errorCount: 0,
        percentComplete: 0,
        pagesPerMinute: 0,
        etaIso: null,
        elapsedMs: 0,
        remainingPagesEstimate: 0,
    };
}
