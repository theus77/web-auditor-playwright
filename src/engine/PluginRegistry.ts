import type {
    EngineState,
    IPlugin,
    PluginPhase,
    PluginSummary,
    Report,
    ResourceContext,
} from "./types.js";
import { ErrorUtils } from "../utils/ErrorUtils.js";

type PluginRegistryOptions = {
    disabledPlugins: string[];
};

export class PluginRegistry {
    private plugins: IPlugin[] = [];
    private disabledPlugins: string[];

    constructor(private readonly options: PluginRegistryOptions) {
        this.disabledPlugins = options.disabledPlugins ?? null;
    }

    register(plugin: IPlugin): this {
        if (this.disabledPlugins.includes(plugin.name)) {
            return this;
        }
        this.plugins.push(plugin);
        return this;
    }

    list(): IPlugin[] {
        return [...this.plugins];
    }

    async runPhase(phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        for (const plugin of this.plugins) {
            if (!plugin.phases.includes(phase) || !plugin.applies(ctx)) {
                continue;
            }
            try {
                await plugin.run(phase, ctx);
            } catch (e) {
                ctx.findings.push({
                    plugin: plugin.name,
                    category: "plugins",
                    type: "error",
                    code: "UNEXPECTED_ERROR",
                    message: ErrorUtils.errorMessage("Failed to run the plugin", e),
                    url: ctx.url,
                });
            }
        }
    }

    getSummaries(state: EngineState): PluginSummary[] {
        return this.plugins
            .filter((plugin) => plugin.includeInSummary?.() ?? false)
            .map((plugin) => {
                plugin.hydrateFromState?.(state);
                return plugin.getSummary?.();
            })
            .filter((summary): summary is PluginSummary => summary !== null);
    }

    getReports(state: EngineState): Report[] {
        return this.plugins
            .filter((plugin) => plugin.getReport !== undefined)
            .map((plugin) => plugin.getReport?.(state))
            .filter((report): report is Report => report !== undefined);
    }
}
