import type { PluginSummary } from "./types.js";

function pad(value: string | number, length: number): string {
    return String(value).padEnd(length, " ");
}

export function printPluginSummaryTable(summaries: PluginSummary[]): void {
    if (summaries.length === 0) {
        console.log("No plugin summaries.");
        return;
    }

    const headers = ["Plugin", "Treated", "Info", "Warnings", "Errors"];

    const rows = summaries.map((s) => [s.plugin, s.treatedUrls, s.infos, s.warnings, s.errors]);

    const colWidths = headers.map((header, i) =>
        Math.max(header.length, ...rows.map((row) => String(row[i]).length)),
    );

    const buildRow = (row: (string | number)[]) =>
        "| " + row.map((cell, i) => pad(cell, colWidths[i])).join(" | ") + " |";

    const separator = "+-" + colWidths.map((w) => "-".repeat(w)).join("-+-") + "-+";

    console.log("\n=== Plugin Summary ===\n");

    console.log(separator);
    console.log(buildRow(headers));
    console.log(separator);

    for (const row of rows) {
        console.log(buildRow(row));
    }

    console.log(separator);
}
